import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

dotenv.config({ path: resolve(process.cwd(), '../.env') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const isTypeScript = __filename.endsWith('.ts');

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'autopartes',
  password: process.env.DB_PASSWORD ?? 'autopartes_dev',
  database: process.env.DB_NAME ?? 'autopartes',
  synchronize: false,
  entities: [resolve(__dirname, `../modules/**/*.entity.${isTypeScript ? 'ts' : 'js'}`)],
  migrations: [resolve(__dirname, `migrations/*.${isTypeScript ? 'ts' : 'js'}`)],
});

export default AppDataSource;
