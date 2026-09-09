import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { IMailService, MensajeMail } from '../interfaces/mail-service.interface';

const PUERTO_SMTP_POR_DEFECTO = 587;
const PUERTO_SMTP_IMPLICITO_TLS = 465;

/**
 * Driver real de correo. Se instancia sólo cuando MAIL_DRIVER=smtp y hay SMTP_HOST.
 */
@Injectable()
export class NodemailerMailService implements IMailService {
  private readonly logger = new Logger(NodemailerMailService.name);
  private readonly transporter: Transporter;
  private readonly remitente: string;

  constructor(private readonly config: ConfigService) {
    const puerto = Number(this.config.get<string>('SMTP_PORT', String(PUERTO_SMTP_POR_DEFECTO)));
    const usuario = this.config.get<string>('SMTP_USER');
    const contrasena = this.config.get<string>('SMTP_PASS');

    this.transporter = createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: Number.isFinite(puerto) ? puerto : PUERTO_SMTP_POR_DEFECTO,
      secure: puerto === PUERTO_SMTP_IMPLICITO_TLS,
      ...(usuario ? { auth: { user: usuario, pass: contrasena ?? '' } } : {}),
    });

    this.remitente = this.config.get<string>('SMTP_FROM', 'no-reply@autopartes.local');
  }

  async enviar(mensaje: MensajeMail): Promise<void> {
    await this.transporter.sendMail({
      from: this.remitente,
      to: mensaje.to,
      subject: mensaje.subject,
      html: mensaje.html,
    });
    this.logger.log(`Correo enviado -> destinatario: ${mensaje.to} | asunto: ${mensaje.subject}`);
  }
}
