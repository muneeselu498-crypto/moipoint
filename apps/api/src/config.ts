import path from 'node:path';

// Load .env before anything reads it. A real server can set these variables directly instead.
try {
  process.loadEnvFile(path.resolve(__dirname, '../.env'));
} catch {
  /* no .env file: variables come from the environment */
}
// All function dates and times are Indian time, whatever timezone the server runs in.
process.env.TZ = process.env.TZ || 'Asia/Kolkata';

const flag = (v?: string) => v === '1' || v === 'true';

export const cfg = {
  port: Number(process.env.PORT || 4600),
  host: process.env.HOST || '0.0.0.0',
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:4600',
  devTools: flag(process.env.DEV_TOOLS),
  seedDemo: flag(process.env.SEED_DEMO),
  messageProvider: process.env.MESSAGE_PROVIDER || 'dev',
  webhookUrl: process.env.MESSAGE_WEBHOOK_URL || '',
  webhookSecret: process.env.MESSAGE_WEBHOOK_SECRET || '',
  paymentProvider: process.env.PAYMENT_PROVIDER || 'simulate',
  chromePath: process.env.CHROME_PATH || '',
  webDist: path.resolve(__dirname, '../../web/dist'),
  uploadDir: path.resolve(__dirname, '../uploads'),
  secureCookie: (process.env.PUBLIC_URL || '').startsWith('https://'),
};
