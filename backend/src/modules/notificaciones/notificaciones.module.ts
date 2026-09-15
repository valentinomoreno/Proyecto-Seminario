import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentasCorrientesModule } from '../cuentas-corrientes/cuentas-corrientes.module';
import { NotificacionesController } from './controllers/notificaciones.controller';
import { AvisoCobroEnviado } from './entities/aviso-cobro-enviado.entity';
import { IMailService, MAIL_SERVICE } from './interfaces/mail-service.interface';
import { AvisosCobroService } from './services/avisos-cobro.service';
import { ConsoleMailService } from './services/console-mail.service';
import { MoraService } from './services/mora.service';
import { NodemailerMailService } from './services/nodemailer-mail.service';

@Module({
  imports: [TypeOrmModule.forFeature([AvisoCobroEnviado]), CuentasCorrientesModule],
  controllers: [NotificacionesController],
  providers: [
    // Driver de correo elegido por configuración (DIP): SMTP real sólo si está configurado.
    {
      provide: MAIL_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): IMailService => {
        const driver = config.get<string>('MAIL_DRIVER', 'console');
        const host = config.get<string>('SMTP_HOST');
        return driver === 'smtp' && host ? new NodemailerMailService(config) : new ConsoleMailService();
      },
    },
    // Services
    AvisosCobroService,
    MoraService,
  ],
  exports: [AvisosCobroService, MoraService],
})
export class NotificacionesModule {}
