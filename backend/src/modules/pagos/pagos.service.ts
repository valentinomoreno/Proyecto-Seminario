import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { UsuarioAutenticado } from '../../common/interfaces/usuario-autenticado.interface';
import { NombreRol } from '../../common/enums/nombre-rol.enum';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Producto } from '../productos/entities/producto.entity';
import { IVentasRepository, VENTAS_REPOSITORY } from '../ventas/repositories/interfaces/ventas-repository.interface';
import { MetodoCobro } from '../ventas/enums/metodo-cobro.enum';
import { ModalidadPago } from '../ventas/enums/modalidad-pago.enum';
import { CrearOrdenDto } from './dto/crear-orden.dto';
import { MercadoPagoClient, MercadoPagoHttpError, OrdenMp } from './mercado-pago.client';

type EstadoQr = 'CREANDO' | 'PENDIENTE' | 'APROBADO' | 'CANCELADO' | 'EXPIRADO' | 'ERROR';
export interface EstadoResponse { id: string; estado: EstadoQr; qrData: string | null; monto: number; venceEn: Date; idVenta: number | null; error: string | null; reservaActiva: boolean; simulado: boolean }
interface PagoRow {
  id: string;
  clave_idempotencia: string;
  solicitud_hash: string;
  referencia: string;
  id_orden_mp: string | null;
  id_cliente: number;
  id_usuario: number;
  id_venta: number | null;
  monto: string;
  estado: EstadoQr;
  qr_data: string | null;
  vence_en: Date;
  error: string | null;
}
interface ItemRow { id_producto: number; cantidad: number; precio_unitario: string }

@Injectable()
export class PagosService {
  private procesando = false;

  constructor(
    private readonly db: DataSource,
    private readonly mp: MercadoPagoClient,
    private readonly config: ConfigService,
    @Inject(VENTAS_REPOSITORY) private readonly ventas: IVentasRepository,
  ) {}

  private simuladorHabilitado(): boolean {
    return this.config.get<string>('MP_SIMULATOR_ENABLED') === 'true'
      && this.config.get<string>('NODE_ENV') !== 'production';
  }

  private esSimulada(pago: PagoRow): boolean {
    return pago.referencia.startsWith('SIM-');
  }

  async crear(dto: CrearOrdenDto, usuario: UsuarioAutenticado, clave: string) {
    const simulado = this.simuladorHabilitado();
    if (!simulado && (!this.mp.configured() || !this.config.get<string>('MP_WEBHOOK_SECRET')?.trim())) {
      const faltantes = ['MP_ACCESS_TOKEN', 'MP_EXTERNAL_POS_ID', 'MP_WEBHOOK_SECRET']
        .filter((nombre) => !this.config.get<string>(nombre)?.trim());
      throw new ServiceUnavailableException(faltantes.length
        ? `Mercado Pago QR no está configurado. Faltan ${faltantes.join(', ')} en el backend.`
        : 'Mercado Pago QR no está configurado en el backend.');
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clave)) {
      throw new BadRequestException('Idempotency-Key debe ser un UUID.');
    }
    if (new Set(dto.items.map((item) => item.idProducto)).size !== dto.items.length) {
      throw new BadRequestException('Cada producto debe aparecer una sola vez.');
    }
    const items = [...dto.items].sort((a, b) => a.idProducto - b.idProducto);
    const hash = createHash('sha256').update(JSON.stringify({ idCliente: dto.idCliente, items })).digest('hex');
    const existente = await this.db.query<PagoRow[]>('SELECT * FROM pagos_qr WHERE clave_idempotencia = $1', [clave]);
    if (existente[0]) {
      if (existente[0].solicitud_hash !== hash) throw new BadRequestException('La clave de idempotencia corresponde a otra compra.');
      return this.estado(existente[0].id, usuario);
    }
    const id = randomUUID();
    try {
      await this.db.transaction(async (manager) => {
        const cliente = await manager.getRepository(Cliente).findOneBy({ idCliente: dto.idCliente });
        if (!cliente) throw new NotFoundException('Cliente no encontrado.');
        const productos = await manager.getRepository(Producto).createQueryBuilder('p')
          .setLock('pessimistic_write')
          .where('p.idProducto IN (:...ids)', { ids: items.map((item) => item.idProducto) })
          .orderBy('p.idProducto', 'ASC').getMany();
        const encontrados = new Map(productos.map((p) => [p.idProducto, p]));
        let centavos = 0;
        for (const item of items) {
          const p = encontrados.get(item.idProducto);
          if (!p || p.stock - p.stockReservado < item.cantidad) {
            throw new BadRequestException(`Stock insuficiente para producto ${item.idProducto}.`);
          }
          centavos += Math.round(Number(p.precioUnitario) * 100) * item.cantidad;
          p.stockReservado += item.cantidad;
          await manager.getRepository(Producto).save(p);
        }
        await manager.query(`INSERT INTO pagos_qr
          (id, clave_idempotencia, solicitud_hash, referencia, id_cliente, id_usuario, monto, estado, vence_en)
          VALUES ($1,$2,$3,$4,$5,$6,$7,'CREANDO',now() + interval '15 minutes')`,
        [id, clave, hash, simulado ? `SIM-${id}` : `QR-${id}`, dto.idCliente, usuario.idUsuario, (centavos / 100).toFixed(2)]);
        for (const item of items) {
          const p = encontrados.get(item.idProducto)!;
          await manager.query('INSERT INTO pagos_qr_items (id_pago,id_producto,cantidad,precio_unitario) VALUES ($1,$2,$3,$4)',
            [id, item.idProducto, item.cantidad, p.precioUnitario]);
        }
      });
    } catch (error) {
      // Una solicitud concurrente con la misma clave debe devolver el intento original.
      const repetido = await this.db.query<PagoRow[]>('SELECT * FROM pagos_qr WHERE clave_idempotencia = $1', [clave]);
      if (repetido[0]) {
        if (repetido[0].solicitud_hash !== hash) throw new BadRequestException('La clave de idempotencia corresponde a otra compra.');
        return this.estado(repetido[0].id, usuario);
      }
      throw error;
    }
    if (simulado) await this.crearSimulada(id);
    else await this.crearRemota(id).catch(() => undefined);
    return this.estado(id, usuario);
  }

  async estado(id: string, usuario: UsuarioAutenticado): Promise<EstadoResponse> {
    const [pago] = await this.db.query<PagoRow[]>('SELECT * FROM pagos_qr WHERE id = $1', [id]);
    if (!pago) throw new NotFoundException('Orden QR no encontrada.');
    if (pago.id_usuario !== usuario.idUsuario && usuario.rol !== NombreRol.ADMINISTRADOR) {
      throw new ForbiddenException('La orden pertenece a otro usuario.');
    }
    return {
      id: pago.id, estado: pago.estado, qrData: pago.qr_data,
      monto: Number(pago.monto), venceEn: pago.vence_en,
      idVenta: pago.id_venta, error: pago.error,
      reservaActiva: pago.estado === 'CREANDO' || pago.estado === 'PENDIENTE' || (pago.estado === 'ERROR' && Boolean(pago.id_orden_mp)),
      simulado: this.esSimulada(pago),
    };
  }

  async estadoPorClave(clave: string, usuario: UsuarioAutenticado): Promise<EstadoResponse> {
    const [pago] = await this.db.query<PagoRow[]>('SELECT id FROM pagos_qr WHERE clave_idempotencia=$1', [clave]);
    if (!pago) throw new NotFoundException('Orden QR no encontrada para esa clave.');
    return this.estado(pago.id, usuario);
  }

  async cancelar(id: string, usuario: UsuarioAutenticado): Promise<EstadoResponse> {
    await this.estado(id, usuario);
    const [pago] = await this.db.query<PagoRow[]>('SELECT * FROM pagos_qr WHERE id = $1', [id]);
    if (pago.estado === 'APROBADO') throw new BadRequestException('El pago ya fue acreditado.');
    if (pago.estado === 'CANCELADO' || pago.estado === 'EXPIRADO' || (pago.estado === 'ERROR' && !pago.id_orden_mp)) return this.estado(id, usuario);
    if (this.esSimulada(pago)) {
      await this.liberar(id, 'CANCELADO');
      return this.estado(id, usuario);
    }
    if (!pago.id_orden_mp) {
      await this.crearRemota(id);
      const [actual] = await this.db.query<PagoRow[]>('SELECT * FROM pagos_qr WHERE id=$1', [id]);
      if (!actual?.id_orden_mp) throw new ServiceUnavailableException('La orden remota todavía no está disponible.');
      return this.cancelar(id, usuario);
    }
    let remota: OrdenMp;
    try {
      remota = await this.mp.cancelar(pago.id_orden_mp, `cancel-${id}`);
    } catch {
      remota = await this.mp.consultar(pago.id_orden_mp);
    }
    await this.aplicarEstado(id, remota);
    return this.estado(id, usuario);
  }

  async simularAcreditacion(id: string, usuario: UsuarioAutenticado): Promise<EstadoResponse> {
    if (!this.simuladorHabilitado()) throw new ForbiddenException('El simulador QR no está habilitado.');
    await this.estado(id, usuario);
    const [pago] = await this.db.query<PagoRow[]>('SELECT * FROM pagos_qr WHERE id=$1', [id]);
    if (!pago || !this.esSimulada(pago)) throw new BadRequestException('La orden no es simulada.');
    if (pago.estado === 'APROBADO') return this.estado(id, usuario);
    if (pago.estado !== 'PENDIENTE') throw new BadRequestException('La orden simulada no está pendiente.');
    if (new Date(pago.vence_en).getTime() <= Date.now()) {
      await this.liberar(id, 'EXPIRADO');
      return this.estado(id, usuario);
    }
    await this.acreditar(id, `SIM-PAY-${id}`);
    return this.estado(id, usuario);
  }

  validarFirma(idOrden: string, firma: string, requestId: string): boolean {
    const secreto = this.config.get<string>('MP_WEBHOOK_SECRET');
    const ts = /(?:^|,)ts=(\d+)(?:,|$)/.exec(firma)?.[1];
    const v1 = /(?:^|,)v1=([a-f0-9]{64})(?:,|$)/i.exec(firma)?.[1];
    if (!secreto || !ts || !v1 || !idOrden || !requestId) return false;
    const mensaje = `id:${idOrden};request-id:${requestId};ts:${ts};`;
    const esperado = createHmac('sha256', secreto).update(mensaje).digest();
    const recibido = Buffer.from(v1, 'hex');
    return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
  }

  async recibirWebhook(idEvento: string, idOrden: string) {
    await this.db.query(`INSERT INTO pagos_qr_eventos (id_evento,id_orden_mp)
      VALUES ($1,$2) ON CONFLICT (id_evento) DO NOTHING`, [idEvento, idOrden]);
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async conciliar(): Promise<void> {
    if (this.procesando) return;
    this.procesando = true;
    try {
      const eventos = this.mp.configured() ? await this.db.query<Array<{ id_evento: string; id_orden_mp: string }>>(`
        SELECT id_evento,id_orden_mp FROM pagos_qr_eventos WHERE procesado_en IS NULL
        ORDER BY recibido_en LIMIT 30`) : [];
      for (const evento of eventos) {
        try {
          const [pago] = await this.db.query<PagoRow[]>('SELECT * FROM pagos_qr WHERE id_orden_mp=$1', [evento.id_orden_mp]);
          if (pago && !this.esSimulada(pago)) await this.consultarRemota(pago.id);
          await this.db.query('UPDATE pagos_qr_eventos SET procesado_en=now(), intentos=intentos+1 WHERE id_evento=$1', [evento.id_evento]);
        } catch (error) {
          await this.db.query('UPDATE pagos_qr_eventos SET intentos=intentos+1, ultimo_error=$2 WHERE id_evento=$1',
            [evento.id_evento, error instanceof Error ? error.message.slice(0, 500) : 'Error']);
        }
      }
      const pendientes = await this.db.query<Array<{ id: string; estado: EstadoQr; referencia: string; vence_en: Date }>>(`
        SELECT id, estado, referencia, vence_en FROM pagos_qr WHERE
          (estado IN ('CREANDO','PENDIENTE') OR (estado='ERROR' AND id_orden_mp IS NOT NULL))
          AND actualizado_en < now() - interval '8 seconds'
        ORDER BY actualizado_en LIMIT 30`);
      for (const pendiente of pendientes) {
        try {
          if (pendiente.referencia.startsWith('SIM-')) {
            if (pendiente.estado === 'CREANDO' && this.simuladorHabilitado()) await this.crearSimulada(pendiente.id);
            else if (pendiente.estado === 'PENDIENTE' && new Date(pendiente.vence_en).getTime() <= Date.now()) {
              await this.liberar(pendiente.id, 'EXPIRADO');
            }
            continue;
          }
          if (!this.mp.configured()) continue;
          if (pendiente.estado === 'CREANDO') await this.crearRemota(pendiente.id);
          else await this.consultarRemota(pendiente.id);
        } catch (error) {
          await this.registrarError(pendiente.id, error);
        }
      }
    } finally {
      this.procesando = false;
    }
  }

  private async crearSimulada(id: string): Promise<void> {
    await this.db.query(`UPDATE pagos_qr SET id_orden_mp=$2, qr_data=$3, estado='PENDIENTE', actualizado_en=now()
      WHERE id=$1 AND estado='CREANDO' AND referencia=$4`,
    [id, `SIM${id.replaceAll('-', '').toUpperCase()}`, `SIMULACION-QR:${id}`, `SIM-${id}`]);
  }

  private async crearRemota(id: string): Promise<void> {
    const [pago] = await this.db.query<PagoRow[]>('SELECT * FROM pagos_qr WHERE id = $1', [id]);
    if (!pago || pago.estado !== 'CREANDO') return;
    let orden: OrdenMp;
    try {
      orden = await this.mp.crear(pago.referencia, pago.clave_idempotencia, pago.monto);
    } catch (error) {
      if (error instanceof MercadoPagoHttpError && [400, 401, 403, 404].includes(error.status)) {
        await this.liberar(id, 'ERROR', error.message);
      }
      throw error;
    }
    if (orden.external_reference !== pago.referencia || Number(orden.total_amount) !== Number(pago.monto) || orden.currency !== 'ARS' || !orden.type_response?.qr_data) {
      await this.db.query("UPDATE pagos_qr SET id_orden_mp=$2, estado='ERROR', error='Respuesta de orden QR inconsistente', actualizado_en=now() WHERE id=$1", [id, orden.id]);
      if (orden.status === 'created') {
        try { await this.aplicarEstado(id, await this.mp.cancelar(orden.id, `cancel-${id}`)); }
        catch { /* La conciliación conserva la orden para reintentar. */ }
      }
      return;
    }
    const creadoEn = orden.created_date ? new Date(orden.created_date) : new Date();
    const venceEn = new Date(creadoEn.getTime() + 15 * 60_000);
    await this.db.query(`UPDATE pagos_qr SET id_orden_mp=$2, qr_data=$3, estado='PENDIENTE',
      vence_en=$4, actualizado_en=now(), error=NULL
      WHERE id=$1 AND estado='CREANDO'`, [id, orden.id, orden.type_response.qr_data, venceEn]);
    if (orden.status !== 'created') await this.aplicarEstado(id, orden);
  }

  private async consultarRemota(id: string): Promise<void> {
    const [pago] = await this.db.query<PagoRow[]>('SELECT * FROM pagos_qr WHERE id=$1', [id]);
    if (!pago?.id_orden_mp || !['PENDIENTE', 'APROBADO', 'ERROR'].includes(pago.estado)) return;
    const orden = await this.mp.consultar(pago.id_orden_mp);
    if (orden.status === 'created' && new Date(pago.vence_en).getTime() < Date.now()) {
      await this.aplicarEstado(id, await this.mp.cancelar(pago.id_orden_mp, `cancel-${id}`));
    } else await this.aplicarEstado(id, orden);
  }

  private async aplicarEstado(id: string, orden: OrdenMp): Promise<void> {
    const [pago] = await this.db.query<PagoRow[]>('SELECT * FROM pagos_qr WHERE id=$1', [id]);
    if (!pago || pago.id_orden_mp !== orden.id) return;
    if (orden.status === 'expired' || orden.status === 'canceled') {
      await this.liberar(id, orden.status === 'expired' ? 'EXPIRADO' : 'CANCELADO');
      return;
    }
    if (orden.external_reference !== pago.referencia || orden.currency !== 'ARS' || Number(orden.total_amount) !== Number(pago.monto)) {
      await this.db.query("UPDATE pagos_qr SET estado='ERROR', error='Importe o referencia remota inconsistente' WHERE id=$1", [id]);
      return;
    }
    if (orden.status === 'processed') {
      const pagoMp = orden.transactions?.payments?.find((p) => p.status === 'processed' && p.status_detail === 'accredited');
      if (!pagoMp || Number(pagoMp.amount) !== Number(pago.monto)) return;
      await this.acreditar(id, pagoMp.id ?? orden.id);
    } else if (orden.status === 'refunded' && pago.estado === 'APROBADO') {
      await this.db.query("UPDATE pagos_qr SET error='Orden reembolsada: revisar devolución local' WHERE id=$1", [id]);
    } else {
      await this.db.query('UPDATE pagos_qr SET actualizado_en=now() WHERE id=$1 AND estado=$2', [id, 'PENDIENTE']);
    }
  }

  private async acreditar(id: string, referencia: string): Promise<void> {
    const runner = this.db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const [pago] = await runner.query('SELECT * FROM pagos_qr WHERE id=$1 FOR UPDATE', [id]) as PagoRow[];
      if (!pago || pago.estado !== 'PENDIENTE') { await runner.commitTransaction(); return; }
      if (this.esSimulada(pago) && new Date(pago.vence_en).getTime() <= Date.now()) {
        throw new BadRequestException('La orden simulada venció.');
      }
      const items = await runner.query('SELECT * FROM pagos_qr_items WHERE id_pago=$1 ORDER BY id_producto', [id]) as ItemRow[];
      const reservados = new Map(items.map((item) => [item.id_producto, item.cantidad]));
      const precios = new Map(items.map((item) => [item.id_producto, Number(item.precio_unitario)]));
      const venta = await this.ventas.registrarVentaTransaccional({
        idUsuario: pago.id_usuario, idCliente: pago.id_cliente,
        modalidadPago: ModalidadPago.CONTADO, metodoCobro: MetodoCobro.MERCADO_PAGO,
        referenciaPago: referencia.slice(0, 100),
        items: items.map((item) => ({ idProducto: item.id_producto, cantidad: item.cantidad })),
      }, runner, reservados, precios);
      if (Math.round(venta.total * 100) !== Math.round(Number(pago.monto) * 100)) {
        throw new Error('El total de venta no coincide con el pago acreditado.');
      }
      await runner.query("UPDATE pagos_qr SET estado='APROBADO', id_venta=$2, actualizado_en=now(), error=NULL WHERE id=$1", [id, venta.idVenta]);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  private async liberar(id: string, estado: 'CANCELADO' | 'EXPIRADO' | 'ERROR', error?: string): Promise<void> {
    await this.db.transaction(async (manager: EntityManager) => {
      const [pago] = await manager.query<PagoRow[]>('SELECT * FROM pagos_qr WHERE id=$1 FOR UPDATE', [id]);
      if (!pago || !['CREANDO', 'PENDIENTE', 'ERROR'].includes(pago.estado)) return;
      const items = await manager.query<ItemRow[]>('SELECT * FROM pagos_qr_items WHERE id_pago=$1 ORDER BY id_producto', [id]);
      for (const item of items) {
        const producto = await manager.getRepository(Producto).createQueryBuilder('p')
          .setLock('pessimistic_write').where('p.idProducto=:id', { id: item.id_producto }).getOneOrFail();
        producto.stockReservado -= item.cantidad;
        await manager.getRepository(Producto).save(producto);
      }
      await manager.query('UPDATE pagos_qr SET estado=$2, actualizado_en=now(), error=$3 WHERE id=$1', [id, estado, error ?? null]);
    });
  }

  private async registrarError(id: string, error: unknown): Promise<void> {
    await this.db.query('UPDATE pagos_qr SET error=$2, actualizado_en=now() WHERE id=$1',
      [id, error instanceof Error ? error.message.slice(0, 500) : 'Error de conciliación']);
  }
}
