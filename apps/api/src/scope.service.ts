import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { addDays, sha256, today } from './util';

/** What one logged-in person (or an anonymous visitor) is allowed to reach. */
export interface Scope {
  kind: 'anon' | 'tenant' | 'platform';
  userId: string | null;
  user: any | null;
  /** Accounts this person owns. */
  ownerOf: string[];
  /** Every account they can see any part of. */
  accountIds: string[];
  /** Every event they can see. */
  eventIds: string[];
  /** Events they help on in someone's account, with their role and permissions there. */
  helperOn: Record<string, { role: string; perm: any; accountId: string }>;
  /** Changes when access changes, which tells the device to reload everything. */
  key: string;
}

export const ANON: Scope = { kind: 'anon', userId: null, user: null, ownerOf: [], accountIds: [], eventIds: [], helperOn: {}, key: 'anon' };

/** Same defaults as the screens: an Event Admin may do almost everything, a Moi Collector only receives Moi. */
export function permDef(role: string) {
  return role === 'manager'
    ? { list: 1, edit: 1, void: 1, exp: 1, pay: 1, verify: 1, rep: 1, out: 0 }
    : { list: 1, edit: 0, void: 0, exp: 0, pay: 1, verify: 0, rep: 0, out: 0 };
}

/** A helper's access can be limited to the function day or chosen dates. */
export function inAccessWindow(access: any, eventDate?: string | null) {
  const ac = access || { mode: 'always' };
  if (ac.mode === 'always' || !eventDate) return true;
  const d = eventDate;
  const win =
    ac.mode === 'day' ? [d, d]
    : ac.mode === 'day2' ? [d, addDays(d, 1)]
    : ac.mode === 'around' ? [addDays(d, -1), addDays(d, 1)]
    : [ac.from || d, ac.to || ac.from || d];
  const t = today();
  return t >= win[0] && t <= win[1];
}

@Injectable()
export class ScopeService {
  constructor(private prisma: PrismaService) {}

  async forUser(user: any): Promise<Scope> {
    if (!user) return ANON;
    if (user.role === 'platform') {
      return { kind: 'platform', userId: user.id, user, ownerOf: [], accountIds: [], eventIds: [], helperOn: {}, key: `p:${user.id}` };
    }
    const ownerOf = user.role === 'admin' && user.accountId ? [user.accountId] : [];
    const links = await this.prisma.eventUser.findMany({ where: { userId: user.id, deleted: false } });
    const linkedEvents = links.length
      ? await this.prisma.event.findMany({ where: { id: { in: links.map((l) => l.eventId) }, deleted: false } })
      : [];
    const helperOn: Scope['helperOn'] = {};
    for (const l of links) {
      const ev = linkedEvents.find((e) => e.id === l.eventId);
      const d = l.data as any;
      if (ev && inAccessWindow(d.access, ev.date)) {
        helperOn[l.eventId] = { role: l.role, perm: { ...permDef(l.role), ...(d.perm || {}) }, accountId: ev.accountId };
      }
    }
    const owned = ownerOf.length
      ? await this.prisma.event.findMany({ where: { accountId: { in: ownerOf }, deleted: false }, select: { id: true } })
      : [];
    const eventIds = [...new Set([...owned.map((e) => e.id), ...Object.keys(helperOn)])];
    const accountIds = [
      ...new Set([...ownerOf, ...Object.values(helperOn).map((h) => h.accountId), ...(user.accountId ? [user.accountId] : [])]),
    ];
    const key = sha256([user.id, user.role, ...ownerOf, '|', ...accountIds.slice().sort(), '|', ...eventIds.slice().sort()].join(','));
    return { kind: 'tenant', userId: user.id, user, ownerOf, accountIds, eventIds, helperOn, key };
  }
}
