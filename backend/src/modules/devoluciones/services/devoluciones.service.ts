import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { throwFriendlyDatabaseError } from '../../../common/database/database-error.util';
import { UsuarioAutenticado } from '../../../common/interfaces/usuario-autenticado.interface';
import { CuentaCorriente } from '../../cuentas-corrientes/entities/cuenta-corriente.entity';
import { MovimientoCtaCte } from '../../cuentas-corrientes/entities/movimiento-cta-cte.entity';
import { TipoMovimientoCtaCte } from '../../cuentas-corrientes/enums/tipo-movimiento-cta-cte.enum';
import { MovimientoStock } from '../../productos/entities/movimiento-stock.entity';
import { Producto } from '../../productos/entities/producto.entity';
import { TipoMovimientoStock } from '../../productos/enums/tipo-movimiento-stock.enum';
import { Empleado } from '../../usuarios/entities/empleado.entity';
import { VentaDetalle } from '../../ventas/entities/venta-detalle.entity';
import { CreateDevolucionDto, QueryDevolucionesDto } from '../dto/devolucion.dto';
import { Devolucion } from '../entities/devolucion.entity';
import { NotaCredito } from '../entities/nota-credito.entity';
import { DEVOLUCIONES_REPOSITORY, IDevolucionesRepository } from '../repositories/interfaces/devoluciones-repository.interface';

/** RNF-10: plazo legal para aceptar una devolución, contado en días corridos desde la venta. */
const PLAZO_DEVOLUCION_DIAS = 15;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

@Injectable()
export class DevolucionesService {
  constructor(
    @Inject(DEVOLUCIONES_REPOSITORY) private readonly repository: IDevolucionesRepository,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: QueryDevolucionesDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const [devoluciones, total] = await this.repository.findAndCount(query);

    return {
      data: devoluciones.map((devolucion) => this.toResponse(devolucion)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const devolucion = await this.repository.findById(id);
    if (!devolucion) throw new NotFoundException('Devolución no encontrada.');
    return this.toResponse(devolucion);
  }

  async create(dto: CreateDevolucionDto, usuario: UsuarioAutenticado) {
    // RNF-05: la devolución debe quedar asentada contra un empleado real.
    if (usuario.idEmpleado === null) {
      throw new ForbiddenException('El usuario no tiene un empleado asociado para autorizar devoluciones.');
    }

    try {
      const idDevolucion = await this.dataSource.transaction(async (manager) =>
        this.registrarDevolucion(manager, dto, usuario.idEmpleado as number),
      );
      return this.findOne(idDevolucion);
    } catch (error) {
      throwFriendlyDatabaseError(error);
    }
  }

  private async registrarDevolucion(
    manager: EntityManager,
    dto: CreateDevolucionDto,
    idEmpleado: number,
  ): Promise<number> {
    const empleado = await manager.getRepository(Empleado).findOneBy({ idEmpleado });
    if (!empleado) throw new NotFoundException('Empleado no encontrado.');

    const detalle = await manager.getRepository(VentaDetalle).findOne({
      where: { idVentaDetalle: dto.idVentaDetalle },
      relations: { venta: { cliente: true }, producto: true },
    });
    if (!detalle) throw new NotFoundException('El ítem de venta indicado no existe.');

    this.validarPlazo(detalle.venta.fecha);

    const disponible = detalle.cantidad - detalle.cantidadDevuelta;
    if (dto.cantidad > disponible) {
      throw new BadRequestException(
        `Solo pueden devolverse ${disponible} unidad(es) de "${detalle.producto.nombre}": ya se devolvieron ${detalle.cantidadDevuelta} de ${detalle.cantidad}.`,
      );
    }

    // El monto tope queda garantizado: el precio es el snapshot de la venta y la cantidad está acotada por lo disponible.
    const montoDevuelto = Number((detalle.precioUnitario * dto.cantidad).toFixed(2));

    const devolucion = await manager.getRepository(Devolucion).save(
      manager.getRepository(Devolucion).create({
        ventaDetalle: detalle,
        cantidadDevuelta: dto.cantidad,
        motivo: dto.motivo.trim(),
        montoDevuelto,
        aptoReingreso: dto.aptoReingreso,
        empleadoAutoriza: empleado,
        observaciones: dto.observaciones?.trim() || null,
      }),
    );

    detalle.cantidadDevuelta += dto.cantidad;
    await manager.getRepository(VentaDetalle).save(detalle);

    if (dto.aptoReingreso) {
      await this.reingresarStock(manager, detalle.producto.idProducto, dto.cantidad, devolucion, empleado);
    }

    await this.emitirNotaCredito(manager, devolucion, montoDevuelto);
    await this.acreditarEnCuentaCorriente(manager, detalle.venta.cliente.idCliente, devolucion, montoDevuelto, empleado);

    return devolucion.idDevolucion;
  }

  private validarPlazo(fechaVenta: Date): void {
    const diasTranscurridos = Math.floor((Date.now() - new Date(fechaVenta).getTime()) / MS_POR_DIA);
    if (diasTranscurridos > PLAZO_DEVOLUCION_DIAS) {
      throw new BadRequestException(
        `El plazo de ${PLAZO_DEVOLUCION_DIAS} días para devoluciones ha vencido: pasaron ${diasTranscurridos} días desde la venta.`,
      );
    }
  }

  private async reingresarStock(
    manager: EntityManager,
    idProducto: number,
    cantidad: number,
    devolucion: Devolucion,
    empleado: Empleado,
  ): Promise<void> {
    const producto = await manager.getRepository(Producto).findOne({
      where: { idProducto },
      lock: { mode: 'pessimistic_write' },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado.');

    producto.stock += cantidad;
    await manager.getRepository(Producto).save(producto);

    await manager.getRepository(MovimientoStock).save(
      manager.getRepository(MovimientoStock).create({
        producto,
        tipo: TipoMovimientoStock.DEVOLUCION,
        cantidad,
        stockResultante: producto.stock,
        idDevolucion: devolucion.idDevolucion,
        empleado,
        observaciones: `Devolución ${devolucion.idDevolucion} – reingreso por producto apto para reventa`,
      }),
    );
  }

  private async emitirNotaCredito(
    manager: EntityManager,
    devolucion: Devolucion,
    monto: number,
  ): Promise<NotaCredito> {
    const result = await manager.query<Array<{ nextval: string }>>(
      "SELECT nextval('nota_credito_numero_seq') AS nextval",
    );
    const seq = result[0]?.nextval ?? 1;

    return manager.getRepository(NotaCredito).save(
      manager.getRepository(NotaCredito).create({
        devolucion,
        numero: `NC-${String(seq).padStart(5, '0')}`,
        monto,
      }),
    );
  }

  private async acreditarEnCuentaCorriente(
    manager: EntityManager,
    idCliente: number,
    devolucion: Devolucion,
    monto: number,
    empleado: Empleado,
  ): Promise<void> {
    const cuenta = await manager
      .createQueryBuilder(CuentaCorriente, 'cuenta')
      .setLock('pessimistic_write')
      .where('cuenta.id_cliente = :idCliente', { idCliente })
      .getOne();
    if (!cuenta) throw new NotFoundException('El cliente no tiene cuenta corriente asociada.');

    const saldoResultante = Number((cuenta.saldo - monto).toFixed(2));
    await manager.getRepository(MovimientoCtaCte).save(
      manager.getRepository(MovimientoCtaCte).create({
        cuentaCorriente: cuenta,
        tipo: TipoMovimientoCtaCte.NOTA_CREDITO,
        monto: -monto,
        saldoResultante,
        empleado,
        observaciones: `Nota de crédito por devolución ${devolucion.idDevolucion}`,
      }),
    );

    cuenta.saldo = saldoResultante;
    cuenta.fechaUltimoMovimiento = new Date();
    await manager.getRepository(CuentaCorriente).save(cuenta);
  }

  private toResponse(devolucion: Devolucion) {
    const detalle = devolucion.ventaDetalle;
    return {
      idDevolucion: devolucion.idDevolucion,
      fecha: devolucion.fecha,
      cantidadDevuelta: devolucion.cantidadDevuelta,
      motivo: devolucion.motivo,
      montoDevuelto: devolucion.montoDevuelto,
      aptoReingreso: devolucion.aptoReingreso,
      observaciones: devolucion.observaciones,
      venta: detalle?.venta && {
        idVenta: detalle.venta.idVenta,
        numeroComprobante: detalle.venta.numeroComprobante,
        fecha: detalle.venta.fecha,
      },
      producto: detalle?.producto && {
        idProducto: detalle.producto.idProducto,
        sku: detalle.producto.sku,
        nombre: detalle.producto.nombre,
      },
      empleadoAutoriza: devolucion.empleadoAutoriza && {
        idEmpleado: devolucion.empleadoAutoriza.idEmpleado,
        legajo: devolucion.empleadoAutoriza.legajo,
      },
      notaCredito: devolucion.notaCredito && {
        idNotaCredito: devolucion.notaCredito.idNotaCredito,
        numero: devolucion.notaCredito.numero,
        monto: devolucion.notaCredito.monto,
        fechaEmision: devolucion.notaCredito.fechaEmision,
        estado: devolucion.notaCredito.estado,
      },
    };
  }
}
