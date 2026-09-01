import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export function createTypeOrmOptions(config: ConfigService): TypeOrmModuleOptions {
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 5432),
    username: config.get<string>('DB_USER', 'autopartes'),
    password: config.get<string>('DB_PASSWORD', 'autopartes_dev'),
    database: config.get<string>('DB_NAME', 'autopartes'),
    autoLoadEntities: true,
    synchronize: false,
    logging: config.get<string>('DB_LOGGING', 'false') === 'true',
    ...(isProduction ? { ssl: { rejectUnauthorized: true } } : {}),
  };
}
