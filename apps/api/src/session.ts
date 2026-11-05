import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { cfg } from './config';
import { PrismaService } from './prisma.service';
import { ANON, Scope, ScopeService } from './scope.service';
import { randomToken, sha256 } from './util';

export const COOKIE = 'mp_sid';
const DAY = 864e5;

export interface AuthedRequest extends Request {
  scope: Scope;
  sessionRow: any | null;
}

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  async start(res: Response, userId: string, remember: boolean, impersonatorId?: string) {
    const token = randomToken();
    const days = remember ? 30 : 1;
    await this.prisma.session.create({
      data: { tokenHash: sha256(token), userId, remember, impersonatorId: impersonatorId ?? null, expiresAt: new Date(Date.now() + days * DAY) },
    });
    res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: cfg.secureCookie, path: '/', ...(remember ? { maxAge: days * DAY } : {}) });
  }

  async end(req: AuthedRequest, res: Response) {
    if (req.sessionRow) await this.prisma.session.delete({ where: { id: req.sessionRow.id } }).catch(() => {});
    res.clearCookie(COOKIE, { path: '/' });
  }

  /** Used when a password changes, so a stolen session stops working. */
  async endAllFor(userId: string) {
    await this.prisma.session.deleteMany({ where: { userId } });
  }
}

/** Works out who is calling on every request. Nothing below this trusts the browser about identity. */
@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService, private scopes: ScopeService) {}

  async use(req: AuthedRequest, _res: Response, next: NextFunction) {
    req.scope = ANON;
    req.sessionRow = null;
    const token = req.cookies?.[COOKIE];
    if (token) {
      const row = await this.prisma.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
      if (row && row.expiresAt > new Date() && row.user.status === 'active' && !row.user.deleted) {
        req.sessionRow = row;
        req.scope = await this.scopes.forUser(row.user);
      }
    }
    next();
  }
}
