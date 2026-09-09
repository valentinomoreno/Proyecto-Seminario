import { Injectable, Logger } from '@nestjs/common';
import { IMailService, MensajeMail } from '../interfaces/mail-service.interface';

/**
 * Driver por defecto en desarrollo: no abre ninguna conexión SMTP,
 * sólo deja constancia en el log de qué correo se habría enviado.
 */
@Injectable()
export class ConsoleMailService implements IMailService {
  private readonly logger = new Logger(ConsoleMailService.name);

  enviar(mensaje: MensajeMail): Promise<void> {
    this.logger.log(`Correo simulado -> destinatario: ${mensaje.to} | asunto: ${mensaje.subject}`);
    return Promise.resolve();
  }
}
