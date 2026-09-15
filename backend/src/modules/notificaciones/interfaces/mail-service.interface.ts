export const MAIL_SERVICE = Symbol('MAIL_SERVICE');

export interface MensajeMail {
  to: string;
  subject: string;
  html: string;
}

export interface IMailService {
  enviar(mensaje: MensajeMail): Promise<void>;
}
