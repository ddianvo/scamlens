import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { entities } from './entities';
import { InitialSchema1795000000000 } from './migrations/1795000000000-InitialSchema';
config({ path: resolve(__dirname, '../../../../.env'), quiet: true });
export function databaseOptions() {
  const url = process.env.DATABASE_URL;
  if (!url)
    throw new Error('Thiếu DATABASE_URL. Sao chép .env.example thành .env tại thư mục gốc.');
  return {
    type: 'postgres' as const,
    url,
    entities,
    migrations: [InitialSchema1795000000000],
    synchronize: false,
    logging: false as const,
  };
}
export default new DataSource(databaseOptions());
