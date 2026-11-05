import os from 'node:os';
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

/** This computer's addresses on the local network, home Wi-Fi first. */
export const lanAddresses = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i!.address)
    .sort((a, b) => Number(b.startsWith('192.168.')) - Number(a.startsWith('192.168.')));

export const cfg = {
  port: Number(process.env.PORT || 4600),
  host: process.env.HOST || '0.0.0.0',
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:4600',
  devTools: flag(process.env.DEV_TOOLS),
  seedDemo: flag(process.env.SEED_DEMO),
  messageProvider: process.env.MESSAGE_PROVIDER || 'dev',
  webhookUrl: process.env.MESSAGE_WEBHOOK_URL || '',
  webhookSecret: process.env.MESSAGE_WEBHOOK_SECRET || '',
  /** How many proxies sit in front of this server. Stays 0 unless one really does, or callers could fake their address. */
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  paymentProvider: process.env.PAYMENT_PROVIDER || 'simulate',
  chromePath: process.env.CHROME_PATH || '',
  webDist: path.resolve(__dirname, '../../web/dist'),
  uploadDir: path.resolve(__dirname, '../uploads'),
  secureCookie: (process.env.PUBLIC_URL || '').startsWith('https://'),
  /** The one Google account that is Moi Point's Master Admin. Set only on the server, so nothing in a browser can change it. */
  masterAdminEmail: String(process.env.MASTER_ADMIN_EMAIL || '').trim().toLowerCase(),
  /** Google sign-in through Firebase. The web values are public; nothing secret is needed to check sign-ins. */
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    appId: process.env.FIREBASE_APP_ID || '',
    certsUrl: process.env.FIREBASE_CERTS_URL || 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  },
};

/** The address printed in QR codes. On a laptop that means the Wi-Fi address, so a phone can scan it. */
export const publicBase = () => {
  if (!/\/\/(localhost|127\.0\.0\.1)\b/.test(cfg.publicUrl)) return cfg.publicUrl;
  const ip = lanAddresses()[0];
  return ip ? `http://${ip}:${cfg.port}` : cfg.publicUrl;
};
