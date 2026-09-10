import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente, TipoCliente } from '../../clientes/entities/cliente.entity';
import { CuentaCorriente } from '../../cuentas-corrientes/entities/cuenta-corriente.entity';
import {
  CUENTAS_CORRIENTES_REPOSITORY,
  ICuentasCorrientesRepository,
} from '../../cuentas-corrientes/repositories/interfaces/cuentas-corrientes-repository.interface';
import { AvisoCobroEnviado } from '../entities/aviso-cobro-enviado.entity';
import { IMailService, MAIL_SERVICE } from '../interfaces/mail-service.interface';
import { ZONA_HORARIA_NEGOCIO } from '../notificaciones.constants';

export interface ResumenAvisosCobro {
  enviados: number;
  omitidos: number;
}

/**
 * Proceso 1 de RNF-14: del día 1 al 7 de cada mes se avisa por correo a cada
 * cliente con saldo deudor cuál es su saldo pendiente y cómo puede cancelarlo.
 */
@Injectable()
export class AvisosCobroService {
  private readonly logger = new Logger(AvisosCobroService.name);

  constructor(
    @Inject(CUENTAS_CORRIENTES_REPOSITORY) private readonly cuentasRepository: ICuentasCorrientesRepository,
    @Inject(MAIL_SERVICE) private readonly mailService: IMailService,
    @InjectRepository(AvisoCobroEnviado) private readonly avisosRepository: Repository<AvisoCobroEnviado>,
  ) {}

  @Cron('0 8 1-7 * *', { timeZone: ZONA_HORARIA_NEGOCIO })
  async enviarAvisosProgramados(): Promise<void> {
    const resumen = await this.ejecutar();
    this.logger.log(`Avisos de cobro: ${resumen.enviados} enviados, ${resumen.omitidos} omitidos.`);
  }

  /** Público para poder testearlo y dispararlo manualmente desde el controlador de debug. */
  async ejecutar(): Promise<ResumenAvisosCobro> {
    const cuentas = await this.cuentasRepository.findConSaldoDeudor();
    const fecha = this.fechaDelDia(new Date());
    let enviados = 0;
    let omitidos = 0;

    for (const cuenta of cuentas) {
      const cliente = cuenta.cliente;
      // El correo es opcional en el cliente: sin dirección de contacto no hay aviso posible.
      const correo = cliente?.correo;
      if (!correo) {
        omitidos += 1;
        continue;
      }

      const reserva = await this.reservarEnvioDelDia(cliente.idCliente, fecha);
      if (!reserva) {
        omitidos += 1;
        continue;
      }

      try {
        await this.mailService.enviar({
          to: correo,
          subject: 'Aviso de saldo pendiente en su cuenta corriente',
          html: this.construirHtml(cuenta),
        });
        enviados += 1;
      } catch (error) {
        // Si el envío falla liberamos la reserva para poder reintentar en la próxima corrida.
        await this.avisosRepository.delete({ idAviso: reserva.idAviso });
        omitidos += 1;
        this.logger.error(`No se pudo enviar el aviso de cobro a ${correo}.`, error as Error);
      }
    }

    return { enviados, omitidos };
  }

  /**
   * Inserta el registro del día para el cliente. Devuelve `null` si ya existía
   * (aviso ya enviado hoy) o si otra corrida ganó la carrera contra el UNIQUE.
   */
  private async reservarEnvioDelDia(idCliente: number, fecha: string): Promise<AvisoCobroEnviado | null> {
    const existente = await this.avisosRepository.findOne({ where: { idCliente, fecha } });
    if (existente) return null;

    try {
      return await this.avisosRepository.save(this.avisosRepository.create({ idCliente, fecha }));
    } catch {
      return null;
    }
  }

  /** Fecha calendario YYYY-MM-DD en la zona horaria del negocio. */
  private fechaDelDia(referencia: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONA_HORARIA_NEGOCIO,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(referencia);
  }

  /**
   * Nombre para el saludo del correo: persona o empresa según el tipo de cliente.
   * Ambas relaciones son opcionales, así que siempre hay un fallback legible.
   */
  private nombreCliente(cliente: Cliente): string {
    if (cliente.tipo === TipoCliente.PERSONA) {
      const nombreCompleto = `${cliente.persona?.nombre ?? ''} ${cliente.persona?.apellido ?? ''}`.trim();
      if (nombreCompleto) return nombreCompleto;
    } else if (cliente.tipo === TipoCliente.EMPRESA) {
      const razonSocial = cliente.empresa?.razonSocial?.trim() ?? '';
      if (razonSocial) return razonSocial;
    }
    return `Cliente #${cliente.idCliente}`;
  }

  private construirHtml(cuenta: CuentaCorriente): string {
    const cliente = cuenta.cliente;
    const saldo = Number(cuenta.saldo).toFixed(2);

    return [
      `<p>Hola ${this.nombreCliente(cliente)},</p>`,
      `<p>Le recordamos que su cuenta corriente registra un <strong>saldo pendiente de $${saldo}</strong>.</p>`,
      '<p>Puede cancelarlo de las siguientes formas:</p>',
      '<ul>',
      '<li>En efectivo o con tarjeta en nuestro local comercial.</li>',
      '<li>Por transferencia bancaria, indicando su DNI/CUIT en el concepto.</li>',
      '<li>Comunicándose con el área de administración para acordar un plan de pago.</li>',
      '</ul>',
      '<p>Si abona entre el 1 y el 7 de este mes evita el recargo por mora del 10% sobre el saldo impago.</p>',
      '<p>Si ya realizó el pago, por favor ignore este mensaje.</p>',
      '<p>Saludos cordiales,<br>Administración - Autopartes</p>',
    ].join('');
  }
}
