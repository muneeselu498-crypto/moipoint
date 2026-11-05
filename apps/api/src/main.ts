import { cfg } from './config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import express from 'express';
import os from 'node:os';
import path from 'node:path';
import 'reflect-metadata';
import { AppModule } from './app.module';

const lanAddresses = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i!.address);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(cookieParser());
  // photos travel inside records until they reach the server
  app.use(express.json({ limit: '40mb' }));

  app.use((_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Browsers won't add this header on a request forged from another site, which stops cross-site attacks.
  app.use('/api', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const safe = req.method === 'GET' || req.method === 'HEAD' || req.path.startsWith('/webhooks/');
    if (!safe && req.headers['x-moipoint'] !== '1') return res.status(403).json({ error: 'Not allowed' });
    next();
  });

  app.use('/uploads', express.static(cfg.uploadDir, { maxAge: '30d', immutable: true }));
  app.use(express.static(cfg.webDist, { index: false, setHeaders: (res, p) => { if (p.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache'); } }));

  // Every other page address is the app itself, so links like /r/EV003/001 open it
  const index = path.join(cfg.webDist, 'index.html');
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/dev') || req.path.startsWith('/uploads')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(index);
  });

  await app.listen(cfg.port, cfg.host);
  const log = new Logger('MoiPoint');
  log.log(`Open on this laptop:  http://localhost:${cfg.port}`);
  if (cfg.host === '0.0.0.0') lanAddresses().forEach((a) => log.log(`Open on a phone (same Wi-Fi):  http://${a}:${cfg.port}`));
  if (cfg.devTools) log.log(`Dev Outbox:  http://localhost:${cfg.port}/dev/outbox`);
}

bootstrap();
