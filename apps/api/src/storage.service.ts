import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import { cfg } from './config';
import { sha256 } from './util';

const DATA_URL = /^data:(image\/(png|jpeg|jpg|webp|gif)|video\/mp4|application\/pdf);base64,/;
const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'application/pdf': 'pdf' };

/** Fields the screens put straight into an image or video address. */
const ADDRESS_KEYS = new Set(['shot', 'logo', 'photo', 'proof', 'img', 'img2', 'image', 'receipt', 'qr', 'src', 'video']);
/** None of these can appear in a real address, and any of them could break out of the page's markup. */
const UNSAFE = /["'<>`\\\s]/;

export const isDataImage = (v: string) => /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v);

/**
 * The screens keep photos as long text inside records. Stored that way the database would
 * balloon, so pictures are written to files and the record keeps a short link instead.
 * Local disk for now; a cloud bucket can replace `save` without touching anything else.
 */
@Injectable()
export class StorageService {
  constructor() {
    fs.mkdirSync(cfg.uploadDir, { recursive: true });
  }

  save(buf: Buffer, ext: string): string {
    const name = `${sha256(buf.toString('base64')).slice(0, 32)}.${ext}`;
    const file = path.join(cfg.uploadDir, name);
    if (!fs.existsSync(file)) fs.writeFileSync(file, buf);
    return `/uploads/${name}`;
  }

  /** Walks a record and swaps any embedded picture for a link to the saved file. */
  externalize<T>(value: T): T {
    if (typeof value === 'string') {
      const m = value.length > 1024 ? value.match(DATA_URL) : null;
      if (!m) return value;
      return this.save(Buffer.from(value.slice(m[0].length), 'base64'), EXT[m[1]]) as unknown as T;
    }
    if (Array.isArray(value)) return value.map((v) => this.externalize(v)) as unknown as T;
    if (value && typeof value === 'object') {
      const out: any = {};
      for (const [k, v] of Object.entries(value)) out[k] = typeof v === 'string' && ADDRESS_KEYS.has(k) && UNSAFE.test(v) ? null : this.externalize(v);
      return out;
    }
    return value;
  }
}
