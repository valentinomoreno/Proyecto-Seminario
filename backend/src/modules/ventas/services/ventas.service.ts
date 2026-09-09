import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { throwFriendlyDatabaseError } from '../../../common/database/database-error.util';
import { UsuarioAutenticado } from '../../../common/interfaces/usuario-autenticado.interface';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { CuentaCorriente } from '../../cuentas-corrientes/entities/cuenta-corriente.entity';
import { MovimientoCtaCte } from '../../cuentas-corrientes/entities/movimiento-cta-cte.entity';
import { TipoMovimientoCtaCte } from '../../cuentas-corrientes/enums/tipo-movimiento-cta-cte.enum';
import { MovimientoStock } from '../../productos/entities/movimiento-stock.entity';
import { Producto } from '../../productos/entities/producto.entity';
import { TipoMovimientoStock } from '../../productos/enums/tipo-movimiento-stock.enum';
import { Empleado } from '../../usuarios/entities/empleado.entity';
import { CreateVentaDto, QueryVentasDto } from '../dto/venta.dto';
import { Venta } from '../entities/venta.entity';
import { VentaDetalle } from '../entities/venta-detalle.entity';
import { IVentasRepository, VENTAS_REPOSITORY } from '../repositories/interfaces/ventas-repository.interface';

@Injectable()
export class VentasService {
  constructor(
    @Inject(VENTAS_REPOSITORY) private readonly repository: IVentasRepository,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: QueryVentasDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const [ventas, total] = await this.repository.findAndCount(query);

    return {
      data: ventas.map((venta) => this.toResponse(venta)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const venta = await this.repository.findById(id);
    if (!venta) throw new NotFoundException('Venta no encontrada.');
    return this.toResponse(venta);
  }

  async findByComprobante(numeroComprobante: string) {
    const venta = await this.repository.findByNumeroComprobante(numeroComprobante.trim());
    if (!venta) throw new NotFoundException('No existe una venta con ese número de comprobante.');
    return this.toResponse(venta);
  }

  async create(dto: CreateVentaDto, usuario: UsuarioAutenticado) {
    if (usuario.idEmpleado === null) {
      throw new ForbiddenException('El usuario no tiene un empleado asociado para registrar ventas.');
    }

    try {
      const venta = await this.dataSource.transaction(async (manager) =>
        this.registrarVenta(manager, dto, usuario.idEmpleado as number),
      );
      return this.toResponse(venta);
    } catch (error) {
      throwFriendlyDatabaseError(error);
    }
  }

  private async registrarVenta(manager: EntityManager, dto: CreateVentaDto, idEmpleado: number): Promise<Venta> {
    const empleado = await manager.getRepository(Empleado).findOneBy({ idEmpleado });
    if (!empleado) throw new NotFoundException('Empleado no encontrado.');

    const cliente = await manager.getRepository(Cliente).findOneBy({ idCliente: dto.idCliente });
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');
    if (!cliente.activo) throw new BadRequestException('El cliente se encuentra inactivo.');

    const items = this.consolidarItems(dto);
    const detalles: VentaDetalle[] = [];
    const productosActualizados: Array<{ producto: Producto; cantidad: number }> = [];
    let total = 0;

    for (const [idProducto, cantidad] of items) {
      const producto = await manager.getRepository(Producto).findOne({
        where: { idProducto },
        lock: { mode: 'pessimistic_write' },
      });
      if (!producto) throw new NotFoundException(`Producto ${idProducto} no encontrado.`);
      if (producto.stock < cantidad) {
        throw new BadRequestException(
          `Stock insuficiente para "${producto.nombre}": disponible ${producto.stock}, solicitado ${cantidad}.`,
        );
      }

      const subtotal = Number((producto.precioUnitario * cantidad).toFixed(2));
      total += subtotal;
      detalles.push(
        manager.getRepository(VentaDetalle).create({
          producto,
          cantidad,
          precioUnitario: producto.precioUnitario,
          subtotal,
          cantidadDevuelta: 0,
        }),
      );
      productosActualizados.push({ producto, cantidad });
    }

    total = Number(total.toFixed(2));
    const numeroComprobante = await this.generarNumeroComprobante(manager);
    const venta = await manager.getRepository(Venta).save(
      manager.getRepository(Venta).create({
        numeroComprobante,
        cliente,
        empleado,
        total,
        detalles,
      }),
    );

    for (const { producto, cantidad } of productosActualizados) {
      producto.stock -= cantidad;
      await manager.getRepository(Producto).save(producto);
      await manager.getRepository(MovimientoStock).save(
        manager.getRepository(MovimientoStock).create({
          producto,
          tipo: TipoMovimientoStock.VENTA,
          cantidad,
          stockResultante: producto.stock,
          idVenta: venta.idVenta,
          empleado,
          observaciones: `Venta ${numeroComprobante}`,
        }),
      );
    }

    await this.imputarEnCuentaCorriente(manager, cliente.idCliente, venta, total, empleado);
    return venta;
  }

  /** Une cantidades repetidas del mismo producto para que la validación de stock sea sobre el total pedido. */
  private consolidarItems(dto: CreateVentaDto): Map<number, number> {
    const items = new Map<number, number>();
    for (const item of dto.items) {
      items.set(item.idProducto, (items.get(item.idProducto) ?? 0) + item.cantidad);
    }
    return items;
  }

  private async generarNumeroComprobante(manager: EntityManager): Promise<string> {
    const result = await manager.query<Array<{ nextval: string }>>(
      "SELECT nextval('venta_comprobante_seq') AS nextval",
    );
    const seq = result[0]?.nextval ?? 1;
    return `V-${String(seq).padStart(5, '0')}`;
  }

  private async imputarEnCuentaCorriente(
    manager: EntityManager,
    idCliente: number,
    venta: Venta,
    total: number,
    empleado: Empleado,
  ): Promise<void> {
    const cuenta = await manager
      .createQueryBuilder(CuentaCorriente, 'cuenta')
      .setLock('pessimistic_write')
      .where('cuenta.id_cliente = :idCliente', { idCliente })
      .getOne();
    if (!cuenta) throw new NotFoundException('El cliente no tiene cuenta corriente asociada.');

    const saldoResultante = Number((cuenta.saldo + total).toFixed(2));
    await manager.getRepository(MovimientoCtaCte).save(
      manager.getRepository(MovimientoCtaCte).create({
        cuentaCorriente: cuenta,
        tipo: TipoMovimientoCtaCte.IMPUTACION_VENTA,
        monto: total,
        saldoResultante,
        idVenta: venta.idVenta,
        empleado,
        observaciones: `Venta ${venta.numeroComprobante}`,
      }),
    );

    cuenta.saldo = saldoResultante;
    cuenta.fechaUltimoMovimiento = new Date();
    await manager.getRepository(CuentaCorriente).save(cuenta);
  }

  private toResponse(venta: Venta) {
    return {
      idVenta: venta.idVenta,
      numeroComprobante: venta.numeroComprobante,
      fecha: venta.fecha,
      total: venta.total,
      estado: venta.estado,
      cliente: venta.cliente && {
        idCliente: venta.cliente.idCliente,
        nombre: venta.cliente.nombre,
        apellido: venta.cliente.apellido,
        email: venta.cliente.email,
      },
      empleado: venta.empleado && {
        idEmpleado: venta.empleado.idEmpleado,
        legajo: venta.empleado.legajo,
      },
      detalles: (venta.detalles ?? []).map((detalle) => ({
        idVentaDetalle: detalle.idVentaDetalle,
        cantidad: detalle.cantidad,
        cantidadDevuelta: detalle.cantidadDevuelta,
        cantidadDisponibleDevolucion: detalle.cantidad - detalle.cantidadDevuelta,
        precioUnitario: detalle.precioUnitario,
        subtotal: detalle.subtotal,
        producto: detalle.producto && {
          idProducto: detalle.producto.idProducto,
          sku: detalle.producto.sku,
          nombre: detalle.producto.nombre,
        },
      })),
    };
  }
}
