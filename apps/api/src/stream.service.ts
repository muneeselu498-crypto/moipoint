import { Injectable } from '@nestjs/common';
import type { Response } from 'express';

interface Conn {
  res: Response;
  /** null means every account, for Moi Point staff. */
  accounts: Set<string> | null;
}

/** Tells open devices that something changed, so a phone's entry appears on the laptop in moments. */
@Injectable()
export class StreamService {
  private conns = new Set<Conn>();

  constructor() {
    // Keeps connections alive through proxies and mobile networks
    setInterval(() => this.conns.forEach((c) => c.res.write(': ping\n\n')), 25000).unref();
  }

  add(res: Response, accounts: string[] | null) {
    const conn: Conn = { res, accounts: accounts ? new Set(accounts) : null };
    this.conns.add(conn);
    res.on('close', () => this.conns.delete(conn));
  }

  publish(accountIds: Iterable<string>, rev: number) {
    const ids = new Set(accountIds);
    for (const c of this.conns) {
      if (!c.accounts || [...ids].some((a) => c.accounts!.has(a))) c.res.write(`event: rev\ndata: ${rev}\n\n`);
    }
  }
}
