import { BadRequestException, Injectable } from '@nestjs/common';
import { Brackets, DataSource } from 'typeorm';
import { CondicionIva } from '../../clientes/enums/condicion-iva.enum';
import { TipoMovimientoCtaCorriente } from '../../clientes/enums/tipo-movimiento-cta-corriente.enum';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { CuentaCorriente } from '../../clientes/entities/cuenta-corriente.entity';
import { MovimientoCtaCorriente } from '../../clientes/entities/movimiento-cta-corriente.entity';
import { Producto } from '../../productos/entities/producto.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { QueryVentasDto } from '../dto/query-ventas.dto';
import { Cobro } from '../entities/cobro.entity';
import { DetalleVenta } from '../entities/detalle-venta.entity';
import { Factura } from '../entities/factura.entity';
import { MovimientoStock } from '../entities/movimiento-stock.entity';
import { Venta } from '../entities/venta.entity';
import { EstadoVenta } from '../enums/estado-venta.enum';
import { MetodoCobro } from '../enums/metodo-cobro.enum';
import { ModalidadPago } from '../enums/modalidad-pago.enum';
import { TipoFactura } from '../enums/tipo-factura.enum';
import { TipoMovimientoStock } from '../enums/tipo-movimiento-stock.enum';
import {
  IRegistroVentaDatos,
  IVentasRepository,
} from './interfaces/ventas-repository.interface';

@Injectable()
export class TypeOrmVentasRepository implements IVentasRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findAndCount(query: QueryVentasDto): Promise<[Venta[], number]> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);

    const builder = this.dataSource
      .getRepository(Venta)
      .createQueryBuilder('venta')
      .leftJoinAndSelect('venta.usuario', 'usuario')
      .leftJoinAndSelect('venta.cliente', 'cliente')
      .leftJoinAndSelect('cliente.persona', 'persona')
      .leftJoinAndSelect('venta.detalles', 'detalles')
      .leftJoinAndSelect('detalles.producto', 'producto')
      .leftJoinAndSelect('venta.cobro', 'cobro')
      .leftJoinAndSelect('venta.factura', 'factura')
      .orderBy('venta.idVenta', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const buscar = query.buscar?.trim();
    if (buscar) {
      builder.andWhere(
        new Brackets((qb) => {
          qb.where('venta.numeroVenta ILIKE :buscar', { buscar: `%${buscar}%` })
            .orWhere('persona.nombre ILIKE :buscar', { buscar: `%${buscar}%` })
            .orWhere('persona.apellido ILIKE :buscar', { buscar: `%${buscar}%` })
            .orWhere('persona.dni ILIKE :buscar', { buscar: `%${buscar}%` });
        }),
      );
    }

    return builder.getManyAndCount();
  }

  async findById(id: number): Promise<Venta | null> {
    return this.dataSource.getRepository(Venta).findOne({
      where: { idVenta: id },
      relations: {
        usuario: true,
        cliente: { persona: true, cuentaCorriente: true },
        detalles: { producto: true },
        cobro: true,
        factura: true,
      },
    });
  }

  async registrarVentaTransaccional(datos: IRegistroVentaDatos): Promise<Venta> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Prevenir interbloqueos (deadlocks) ordenando IDs de productos
      const productIds = [...new Set(datos.items.map((i) => i.idProducto))].sort(
        (a, b) => a - b,
      );

      // 2. Bloqueo pesimista sobre los productos a vender (PESSIMISTIC_WRITE)
      const lockedProducts = await queryRunner.manager
        .createQueryBuilder(Producto, 'p')
        .setLock('pessimistic_write')
        .where('p.idProducto IN (:...ids)', { ids: productIds })
        .getMany();

      const productMap = new Map(lockedProducts.map((p) => [p.idProducto, p]));

      // 3. Verificación estricta de stock disponible (RNF-18)
      for (const item of datos.items) {
        const prod = productMap.get(item.idProducto);
        if (!prod) {
          throw new BadRequestException(
            `El producto con ID ${item.idProducto} no existe o fue dado de baja.`,
          );
        }
        if (prod.stock < item.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para "${prod.nombre}". Disponible: ${prod.stock}, Solicitado: ${item.cantidad}.`,
          );
        }
      }

      // 4. Calcular detalles, subtotales e importe total
      const detallesParaGuardar: Array<{
        producto: Producto;
        cantidad: number;
        precioUnitario: number;
        subtotal: number;
      }> = [];

      let totalVenta = 0;
      for (const item of datos.items) {
        const prod = productMap.get(item.idProducto)!;
        const subtotalLinea = Math.round(item.cantidad * prod.precioUnitario * 100) / 100;
        totalVenta += subtotalLinea;
        detallesParaGuardar.push({
          producto: prod,
          cantidad: item.cantidad,
          precioUnitario: prod.precioUnitario,
          subtotal: subtotalLinea,
        });
      }
      totalVenta = Math.round(totalVenta * 100) / 100;

      // 5. Descontar stock físico y registrar Kardex (MovimientoStock)
      const movimientosStock: MovimientoStock[] = [];
      for (const item of datos.items) {
        const prod = productMap.get(item.idProducto)!;
        const stockAnterior = prod.stock;
        prod.stock -= item.cantidad;
        await queryRunner.manager.save(prod);

        const movStock = queryRunner.manager.create(MovimientoStock, {
          producto: prod,
          usuario: { idUsuario: datos.idUsuario } as Usuario,
          tipo: TipoMovimientoStock.SALIDA_VENTA,
          cantidad: item.cantidad,
          stockAnterior,
          stockPosterior: prod.stock,
          motivo: `Venta mostrador - ${item.cantidad} unidad(es)`,
        });
        movimientosStock.push(movStock);
      }

      // 6. Generar número de venta correlativo
      const vtaSeqRes = await queryRunner.query(
        "SELECT nextval('venta_numero_seq') AS nextval",
      );
      const vtaSeq = vtaSeqRes[0]?.nextval ?? 1;
      const numeroVenta = `VTA-${String(vtaSeq).padStart(8, '0')}`;

      // 7. Determinar subtotal e IVA según condición fiscal
      const esFacturaA =
        datos.condicionIva === CondicionIva.RESPONSABLE_INSCRIPTO &&
        datos.modalidadPago === ModalidadPago.CONTADO;

      let subtotalFinal = totalVenta;
      let ivaFinal = 0;
      if (esFacturaA) {
        subtotalFinal = Math.round((totalVenta / 1.21) * 100) / 100;
        ivaFinal = Math.round((totalVenta - subtotalFinal) * 100) / 100;
      }

      // 8. Crear y guardar cabecera de Venta
      const nuevaVenta = queryRunner.manager.create(Venta, {
        numeroVenta,
        subtotal: subtotalFinal,
        iva: ivaFinal,
        total: totalVenta,
        modalidadPago: datos.modalidadPago,
        estado: EstadoVenta.COMPLETADA,
        usuario: { idUsuario: datos.idUsuario } as Usuario,
        cliente: { idCliente: datos.idCliente } as Cliente,
      });
      const ventaGuardada = await queryRunner.manager.save(nuevaVenta);

      // 9. Guardar detalles de venta
      const detallesEntidades = detallesParaGuardar.map((det) =>
        queryRunner.manager.create(DetalleVenta, {
          venta: ventaGuardada,
          producto: det.producto,
          cantidad: det.cantidad,
          precioUnitario: det.precioUnitario,
          subtotal: det.subtotal,
        }),
      );
      await queryRunner.manager.save(detallesEntidades);

      // 10. Asociar venta a los movimientos de stock
      for (const mov of movimientosStock) {
        mov.venta = ventaGuardada;
        await queryRunner.manager.save(mov);
      }

      // 11. Cobro y Facturación según modalidad
      if (datos.modalidadPago === ModalidadPago.CONTADO) {
        // Registrar entidad Cobro
        const cobro = queryRunner.manager.create(Cobro, {
          venta: ventaGuardada,
          metodoCobro: datos.metodoCobro ?? MetodoCobro.EFECTIVO,
          monto: totalVenta,
          referencia: datos.referenciaPago?.trim() || null,
        });
        await queryRunner.manager.save(cobro);

        // Determinar tipo de factura
        let tipoFactura = TipoFactura.FACTURA_B;
        let seqName = 'factura_b_seq';
        let prefijo = 'B-0001-';

        if (datos.condicionIva === CondicionIva.RESPONSABLE_INSCRIPTO) {
          tipoFactura = TipoFactura.FACTURA_A;
          seqName = 'factura_a_seq';
          prefijo = 'A-0001-';
        } else if (datos.condicionIva === CondicionIva.EXENTO) {
          tipoFactura = TipoFactura.FACTURA_C;
          seqName = 'factura_c_seq';
          prefijo = 'C-0001-';
        }

        const factSeqRes = await queryRunner.query(
          `SELECT nextval('${seqName}') AS nextval`,
        );
        const factSeq = factSeqRes[0]?.nextval ?? 1;
        const numeroFactura = `${prefijo}${String(factSeq).padStart(8, '0')}`;

        const caeSimulado = `${Math.floor(10000000000000 + Math.random() * 90000000000000)}`;
        const fechaVencCae = new Date();
        fechaVencCae.setDate(fechaVencCae.getDate() + 10);

        const factura = queryRunner.manager.create(Factura, {
          venta: ventaGuardada,
          tipoFactura,
          numeroFactura,
          subtotal: subtotalFinal,
          iva: ivaFinal,
          total: totalVenta,
          cae: caeSimulado,
          fechaVencimientoCae: fechaVencCae,
        });
        await queryRunner.manager.save(factura);
      } else {
        // Carga a Cuenta Corriente (CUENTA_CORRIENTE)
        if (!datos.cuentaCorrienteHabilitada) {
          throw new BadRequestException(
            'El cliente seleccionado no tiene cuenta corriente habilitada.',
          );
        }

        const ctaCte = await queryRunner.manager
          .createQueryBuilder(CuentaCorriente, 'cta')
          .setLock('pessimistic_write')
          .where('cta.id_cliente = :idCliente', { idCliente: datos.idCliente })
          .getOne();

        if (!ctaCte || !ctaCte.activo) {
          throw new BadRequestException(
            'La cuenta corriente del cliente no se encuentra activa o no existe.',
          );
        }

        const saldoActual = Number(ctaCte.saldo) || 0;
        const limiteCredito = Number(ctaCte.limiteCredito) || 0;

        if (limiteCredito > 0 && saldoActual + totalVenta > limiteCredito) {
          throw new BadRequestException(
            `Límite de crédito excedido. Límite: $${limiteCredito.toFixed(2)}, Saldo actual: $${saldoActual.toFixed(2)}, Compra: $${totalVenta.toFixed(2)}.`,
          );
        }

        const saldoPosterior = Math.round((saldoActual + totalVenta) * 100) / 100;
        ctaCte.saldo = saldoPosterior;
        await queryRunner.manager.save(ctaCte);

        // Movimiento de Cuenta Corriente (IMPUTACION_VENTA)
        const movCta = queryRunner.manager.create(MovimientoCtaCorriente, {
          cuentaCorriente: ctaCte,
          idVenta: ventaGuardada.idVenta,
          tipo: TipoMovimientoCtaCorriente.IMPUTACION_VENTA,
          monto: totalVenta,
          saldoPosterior,
          descripcion: `Imputación por venta ${ventaGuardada.numeroVenta}`,
        });
        await queryRunner.manager.save(movCta);

        // Emisión de Remito Comercial
        const remSeqRes = await queryRunner.query(
          "SELECT nextval('remito_numero_seq') AS nextval",
        );
        const remSeq = remSeqRes[0]?.nextval ?? 1;
        const numeroRemito = `REM-0001-${String(remSeq).padStart(8, '0')}`;

        const remito = queryRunner.manager.create(Factura, {
          venta: ventaGuardada,
          tipoFactura: TipoFactura.REMITO,
          numeroFactura: numeroRemito,
          subtotal: totalVenta,
          iva: 0,
          total: totalVenta,
          cae: null,
          fechaVencimientoCae: null,
        });
        await queryRunner.manager.save(remito);
      }

      await queryRunner.commitTransaction();

      // Devolver venta completa con todas sus relaciones
      return (await this.findById(ventaGuardada.idVenta))!;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
