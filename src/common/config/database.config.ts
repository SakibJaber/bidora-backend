import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  useSSL: process.env.DB_USE_SSL === 'true',
}));
