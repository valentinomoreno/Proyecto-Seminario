import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { throwFriendlyDatabaseError } from '../../../common/database/database-error.util';
import { UsuarioAutenticado } from '../../../common/interfaces/usuario-autenticado.interface';
import { CuentaCorriente } from '../../cuentas-corrientes/entities/cuenta-corriente.entity';
import { MovimientoCtaCorriente } from '../../cuentas-corrientes/entities/movimiento-cta-corriente.entity';
import { TipoMovimientoCtaCorriente } from '../../cuentas-corrientes/enums/tipo-movimiento-cta-corriente.enum';
import { Producto } from '../../productos/entities/producto.entity';
import { Empleado } from '../../usuarios/entities/empleado.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { DetalleVenta } from '../../ventas/entities/detalle-venta.entity';
import { MovimientoStock } from '../../ventas/entities/movimiento-stock.entity';
import { TipoMovimientoStock } from '../../ventas/enums/tipo-movimiento-stock.enum';
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
        this.registrarDevolucion(manager, dto, usuario.idEmpleado as number, usuario.idUsuario),
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
    idUsuario: number,
  ): Promise<number> {
    const empleado = await manager.getRepository(Empleado).findOneBy({ idEmpleado });
    if (!empleado) throw new NotFoundException('Empleado no encontrado.');

    const detalle = await manager.getRepository(DetalleVenta).findOne({
      where: { idDetalleVenta: dto.idVentaDetalle },
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
        detalleVenta: detalle,
        cantidadDevuelta: dto.cantidad,
        motivo: dto.motivo.trim(),
        montoDevuelto,
        aptoReingreso: dto.aptoReingreso,
        empleadoAutoriza: empleado,
        observaciones: dto.observaciones?.trim() || null,
      }),
    );

    detalle.cantidadDevuelta += dto.cantidad;
    await manager.getRepository(DetalleVenta).save(detalle);

    if (dto.aptoReingreso) {
      await this.reingresarStock(manager, detalle.producto.idProducto, dto.cantidad, devolucion, idUsuario);
    }

    await this.emitirNotaCredito(manager, devolucion, montoDevuelto);
    await this.acreditarEnCuentaCorriente(manager, detalle.venta.cliente.idCliente, devolucion, montoDevuelto);

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
    idUsuario: number,
  ): Promise<void> {
    const producto = await manager.getRepository(Producto).findOne({
      where: { idProducto },
      lock: { mode: 'pessimistic_write' },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado.');

    const stockAnterior = producto.stock;
    producto.stock += cantidad;
    await manager.getRepository(Producto).save(producto);

    await manager.getRepository(MovimientoStock).save(
      manager.getRepository(MovimientoStock).create({
        producto,
        usuario: { idUsuario } as Usuario,
        tipo: TipoMovimientoStock.ENTRADA_DEVOLUCION,
        cantidad,
        stockAnterior,
        stockPosterior: producto.stock,
        idDevolucion: devolucion.idDevolucion,
        motivo: `Devolución ${devolucion.idDevolucion} – reingreso por producto apto para reventa`,
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

  /**
   * Nota de crédito → acredita al cliente, es decir reduce el saldo. El `monto`
   * del movimiento se guarda siempre positivo (CHECK de la tabla); el signo de
   * la operación lo determina el `tipo`, no el valor almacenado.
   */
  private async acreditarEnCuentaCorriente(
    manager: EntityManager,
    idCliente: number,
    devolucion: Devolucion,
    monto: number,
  ): Promise<void> {
    const cuenta = await manager
      .createQueryBuilder(CuentaCorriente, 'cuenta')
      .setLock('pessimistic_write')
      .where('cuenta.id_cliente = :idCliente', { idCliente })
      .getOne();
    if (!cuenta) throw new NotFoundException('El cliente no tiene cuenta corriente asociada.');

    const saldoPosterior = Number(Math.max(0, cuenta.saldo - monto).toFixed(2));
    await manager.getRepository(MovimientoCtaCorriente).save(
      manager.getRepository(MovimientoCtaCorriente).create({
        cuentaCorriente: cuenta,
        tipo: TipoMovimientoCtaCorriente.NOTA_CREDITO,
        monto,
        saldoPosterior,
        descripcion: `Nota de crédito por devolución ${devolucion.idDevolucion}`,
      }),
    );

    cuenta.saldo = saldoPosterior;
    await manager.getRepository(CuentaCorriente).save(cuenta);
  }

  private toResponse(devolucion: Devolucion) {
    const detalle = devolucion.detalleVenta;
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
        numeroVenta: detalle.venta.numeroVenta,
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
