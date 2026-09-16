import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Brackets, DataSource } from 'typeorm';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { CuentaCorriente } from '../../cuentas-corrientes/entities/cuenta-corriente.entity';
import { MovimientoCtaCorriente } from '../../cuentas-corrientes/entities/movimiento-cta-corriente.entity';
import { TipoMovimientoCtaCorriente } from '../../cuentas-corrientes/enums/tipo-movimiento-cta-corriente.enum';
import { Producto } from '../../productos/entities/producto.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { QueryVentasDto } from '../dto/query-ventas.dto';
import { Cobro } from '../entities/cobro.entity';
import { DetalleVenta } from '../entities/detalle-venta.entity';
import { Factura } from '../entities/factura.entity';
import { MovimientoStock } from '../entities/movimiento-stock.entity';
import { Venta } from '../entities/venta.entity';
import { EstadoVenta } from '../enums/estado-venta.enum';
import { ModalidadPago } from '../enums/modalidad-pago.enum';
import { TipoFactura } from '../enums/tipo-factura.enum';
import { TipoMovimientoStock } from '../enums/tipo-movimiento-stock.enum';
import { excedeLimiteCredito } from '../utils/limite-credito.util';
import {
  IRegistroVentaDatos,
  IVentasRepository,
} from './interfaces/ventas-repository.interface';

const IVA_RATE = 0.21;

@Injectable()
export class TypeOrmVentasRepository implements IVentasRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findAndCount(query: QueryVentasDto): Promise<[Venta[], number]> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const builder = this.baseQuery()
      .orderBy('venta.idVenta', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const buscar = query.buscar?.trim();
    if (buscar) {
      const documento = buscar.replace(/[.\s-]/g, '');
      builder.andWhere(
        new Brackets((where) => {
          where
            .where('venta.numeroVenta ILIKE :buscar', { buscar: `%${buscar}%` })
            .orWhere('persona.nombre ILIKE :buscar', { buscar: `%${buscar}%` })
            .orWhere('persona.apellido ILIKE :buscar', { buscar: `%${buscar}%` })
            .orWhere('empresa.razonSocial ILIKE :buscar', { buscar: `%${buscar}%` })
            .orWhere('persona.dni ILIKE :documento', { documento: `%${documento}%` })
            .orWhere('persona.cuil ILIKE :documento', { documento: `%${documento}%` })
            .orWhere('empresa.cuit ILIKE :documento', { documento: `%${documento}%` });
        }),
      );
    }
    return builder.getManyAndCount();
  }

  async findById(id: number): Promise<Venta | null> {
    return this.baseQuery()
      .where('venta.idVenta = :id', { id })
      .getOne();
  }

  async registrarVentaTransaccional(datos: IRegistroVentaDatos): Promise<Venta> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const items = [...datos.items].sort((a, b) => a.idProducto - b.idProducto);
      const productIds = items.map((item) => item.idProducto);
      if (new Set(productIds).size !== productIds.length) {
        throw new BadRequestException('Cada producto debe aparecer una sola vez en la venta.');
      }

      const cliente = await queryRunner.manager
        .getRepository(Cliente)
        .createQueryBuilder('cliente')
        .innerJoinAndSelect('cliente.condicionIva', 'condicionIva')
        .leftJoinAndSelect('cliente.persona', 'persona')
        .leftJoinAndSelect('cliente.empresa', 'empresa')
        .where('cliente.idCliente = :idCliente', { idCliente: datos.idCliente })
        .getOne();
      if (!cliente) {
        throw new NotFoundException(`El cliente con ID ${datos.idCliente} no existe.`);
      }

      const productos = await queryRunner.manager
        .getRepository(Producto)
        .createQueryBuilder('producto')
        .setLock('pessimistic_write')
        .where('producto.idProducto IN (:...productIds)', { productIds })
        .getMany();
      const productosPorId = new Map(productos.map((producto) => [producto.idProducto, producto]));

      for (const item of items) {
        const producto = productosPorId.get(item.idProducto);
        if (!producto) {
          throw new BadRequestException(
            `El producto con ID ${item.idProducto} no existe o fue dado de baja.`,
          );
        }
        if (producto.stock < item.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}; solicitado: ${item.cantidad}.`,
          );
        }
      }

      const totalCentavos = items.reduce((total, item) => {
        const producto = productosPorId.get(item.idProducto)!;
        return total + Math.round(Number(producto.precioUnitario) * 100) * item.cantidad;
      }, 0);
      const total = totalCentavos / 100;

      let cuentaCorriente: CuentaCorriente | null = null;
      let deudaPosterior = 0;
      let saldoFavorPosterior = 0;
      let saldoFavorAplicado = 0;
      if (datos.modalidadPago === ModalidadPago.CUENTA_CORRIENTE) {
        cuentaCorriente = await queryRunner.manager
          .getRepository(CuentaCorriente)
          .createQueryBuilder('cuenta')
          .setLock('pessimistic_write')
          .where('cuenta.id_cliente = :idCliente', { idCliente: datos.idCliente })
          .getOne();
        if (!cuentaCorriente?.activa) {
          throw new BadRequestException(
            'La cuenta corriente del cliente no existe o no está activa.',
          );
        }
        const deudaActual = this.redondear(Number(cuentaCorriente.saldo));
        const saldoFavorActual = this.redondear(Number(cuentaCorriente.saldoFavor) || 0);
        saldoFavorAplicado = this.redondear(Math.min(saldoFavorActual, total));
        saldoFavorPosterior = this.redondear(saldoFavorActual - saldoFavorAplicado);
        deudaPosterior = this.redondear(deudaActual + total - saldoFavorAplicado);
        // Un límite en cero representa una cuenta sin tope configurado. Es el valor
        // usado por las cuentas habilitadas desde Clientes y no debe impedir su primera compra.
        if (excedeLimiteCredito(deudaPosterior, cuentaCorriente.limiteCredito)) {
          throw new BadRequestException(
            `Límite de crédito excedido. Disponible: $${Math.max(0, cuentaCorriente.limiteCredito - deudaActual).toFixed(2)}; venta neta: $${(total - saldoFavorAplicado).toFixed(2)}.`,
          );
        }
      }

      const numeroVenta = await this.siguienteNumero(queryRunner, 'venta_numero_seq', 'VTA');
      const esFacturaA =
        datos.modalidadPago === ModalidadPago.CONTADO &&
        cliente.condicionIva.codigo === 'RESPONSABLE_INSCRIPTO';
      const subtotalCentavos = esFacturaA
        ? Math.round(totalCentavos / (1 + IVA_RATE))
        : totalCentavos;
      const subtotal = subtotalCentavos / 100;
      const iva = (totalCentavos - subtotalCentavos) / 100;

      const venta = await queryRunner.manager.getRepository(Venta).save(
        queryRunner.manager.getRepository(Venta).create({
          numeroVenta,
          subtotal,
          iva,
          total,
          modalidadPago: datos.modalidadPago,
          estado: EstadoVenta.COMPLETADA,
          usuario: { idUsuario: datos.idUsuario } as Usuario,
          cliente,
        }),
      );

      for (const item of items) {
        const producto = productosPorId.get(item.idProducto)!;
        const stockAnterior = producto.stock;
        producto.stock -= item.cantidad;
        await queryRunner.manager.getRepository(Producto).save(producto);

        const subtotalLinea = Math.round(Number(producto.precioUnitario) * 100) * item.cantidad / 100;
        await queryRunner.manager.getRepository(DetalleVenta).save(
          queryRunner.manager.getRepository(DetalleVenta).create({
            venta,
            producto,
            cantidad: item.cantidad,
            precioUnitario: producto.precioUnitario,
            subtotal: subtotalLinea,
          }),
        );
        await queryRunner.manager.getRepository(MovimientoStock).save(
          queryRunner.manager.getRepository(MovimientoStock).create({
            venta,
            producto,
            usuario: { idUsuario: datos.idUsuario } as Usuario,
            tipo: TipoMovimientoStock.SALIDA_VENTA,
            cantidad: item.cantidad,
            stockAnterior,
            stockPosterior: producto.stock,
            motivo: `Salida por venta ${numeroVenta}`,
          }),
        );
      }

      if (datos.modalidadPago === ModalidadPago.CONTADO) {
        await queryRunner.manager.getRepository(Cobro).save(
          queryRunner.manager.getRepository(Cobro).create({
            venta,
            metodoCobro: datos.metodoCobro!,
            monto: total,
            referencia: datos.referenciaPago ?? null,
          }),
        );

        const tipoFactura = this.tipoFacturaPara(cliente.condicionIva.codigo);
        const numeroFactura = await this.siguienteNumero(
          queryRunner,
          'factura_numero_seq',
          `${tipoFactura.replace('FACTURA_', '')}-0001`,
        );
        await queryRunner.manager.getRepository(Factura).save(
          queryRunner.manager.getRepository(Factura).create({
            venta,
            tipoFactura,
            numeroFactura,
            subtotal,
            iva,
            total,
            cae: null,
            fechaVencimientoCae: null,
          }),
        );
      } else {
        cuentaCorriente!.saldo = deudaPosterior;
        cuentaCorriente!.saldoFavor = saldoFavorPosterior;
        await queryRunner.manager.getRepository(CuentaCorriente).save(cuentaCorriente!);
        await queryRunner.manager.getRepository(MovimientoCtaCorriente).save(
          queryRunner.manager.getRepository(MovimientoCtaCorriente).create({
            cuentaCorriente: cuentaCorriente!,
            venta,
            tipo: TipoMovimientoCtaCorriente.IMPUTACION_VENTA,
            monto: total,
            saldoPosterior: deudaPosterior,
            saldoFavorPosterior,
            descripcion: saldoFavorAplicado > 0
              ? `Imputación de ${numeroVenta}. Se aplicaron $${saldoFavorAplicado.toFixed(2)} de saldo a favor.`
              : `Imputación de ${numeroVenta}`,
          }),
        );

        const numeroRemito = await this.siguienteNumero(queryRunner, 'remito_numero_seq', 'REM-0001');
        await queryRunner.manager.getRepository(Factura).save(
          queryRunner.manager.getRepository(Factura).create({
            venta,
            tipoFactura: TipoFactura.REMITO,
            numeroFactura: numeroRemito,
            subtotal: total,
            iva: 0,
            total,
            cae: null,
            fechaVencimientoCae: null,
          }),
        );
      }

      await queryRunner.commitTransaction();
      const ventaCompleta = await this.findById(venta.idVenta);
      if (!ventaCompleta) throw new Error('No se pudo recuperar la venta registrada.');
      return ventaCompleta;
    } catch (error) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private baseQuery() {
    return this.dataSource
      .getRepository(Venta)
      .createQueryBuilder('venta')
      .leftJoinAndSelect('venta.usuario', 'usuario')
      .leftJoinAndSelect('venta.cliente', 'cliente')
      .leftJoinAndSelect('cliente.condicionIva', 'condicionIva')
      .leftJoinAndSelect('cliente.persona', 'persona')
      .leftJoinAndSelect('cliente.empresa', 'empresa')
      .leftJoinAndSelect('cliente.cuentaCorriente', 'cuentaCorriente')
      .leftJoinAndSelect('venta.detalles', 'detalles')
      .leftJoinAndSelect('detalles.producto', 'producto')
      .leftJoinAndSelect('venta.cobro', 'cobro')
      .leftJoinAndSelect('venta.factura', 'factura');
  }

  private tipoFacturaPara(condicionIva: string): TipoFactura {
    if (condicionIva === 'RESPONSABLE_INSCRIPTO') return TipoFactura.FACTURA_A;
    if (condicionIva === 'EXENTO') return TipoFactura.FACTURA_C;
    return TipoFactura.FACTURA_B;
  }

  private async siguienteNumero(
    queryRunner: import('typeorm').QueryRunner,
    secuencia: 'venta_numero_seq' | 'factura_numero_seq' | 'remito_numero_seq',
    prefijo: string,
  ): Promise<string> {
    const result = await queryRunner.query(
      `SELECT nextval('${secuencia}') AS nextval`,
    ) as Array<{ nextval: string }>;
    return `${prefijo}-${String(result[0]?.nextval ?? '1').padStart(8, '0')}`;
  }

  private redondear(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
