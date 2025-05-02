import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import * as cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';
import { ValidationPipe } from '@nestjs/common';
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // app.enableCors({
  //   origin: ['http://localhost:3000', 'http://localhost:4200'], // React & Flutter web
  //   credentials: true, // <== allow cookies
  // });


  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));
  app.use(cookieParser());
  dayjs.extend(customParseFormat);

  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     whitelist: true,
  //     transform: true, // ⬅️ enables auto type conversion
  //     transformOptions: {
  //       enableImplicitConversion: true,
  //     },
  //   }),
  // );

  
  // // Configure CSRF protection
  // const { doubleCsrfProtection, generateToken } = doubleCsrf({
  //   getSecret: () => process.env.CSRF_SECRET || 'default_secret',
  //   cookieName: 'XSRF-TOKEN',
  //   cookieOptions: {
  //     httpOnly: false,
  //     secure: process.env.NODE_ENV === 'production',
  //     sameSite: 'lax',
  //   },
  //   size: 64,
  // });

  // // Apply CSRF protection middleware
  // app.use(doubleCsrfProtection);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

//     Production Tips

// ✅ Use Helmet, Rate Limiter, and CORS config

// ✅ Enable logging (use NestJS Logger or Winston)

// ✅ Catch and transform all errors using a global exception filter

// ✅ Secure cookies with HttpOnly, Secure, and SameSite flags

// ✅ Split AppModule into feature modules for better tree-shaking and scaling

// Tools to Add
// Swagger for API docs (@nestjs/swagger)

// Compression middleware

// Logger middleware

// Rate limiting with @nestjs/throttler

// Add CSRF protection

// Create unit tests for AuthService

// Add rate limiting to login
