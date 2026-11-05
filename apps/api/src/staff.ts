import type { Scope } from './scope.service';

/** The four Moi Point staff roles from the Master Admin screens. The screens only hide pages, so the server enforces them too. */
export interface StaffRole {
  owner: boolean;
  pages: '*' | string[];
  money: boolean;
  contacts: boolean;
  guests: boolean;
  edit: boolean;
}

const ROLES: Record<string, Omit<StaffRole, 'owner'>> = {
  owner: { pages: '*', money: true, contacts: true, guests: true, edit: true },
  finance: { pages: ['overview', 'accounts', 'payments', 'subs', 'credits', 'cplan', 'coupons', 'plans', 'activity'], money: true, contacts: false, guests: false, edit: true },
  support: { pages: ['overview', 'accounts', 'subs', 'events', 'logins', 'support', 'web', 'activity'], money: false, contacts: true, guests: false, edit: true },
  marketing: { pages: ['overview', 'accounts', 'guests', 'web', 'campaigns', 'announce', 'coupons'], money: false, contacts: false, guests: true, edit: false },
};

/** Only the Owner role decides who can do what, and what the app tells people. */
const OWNER_DOCS = new Set(['roleCfg', 'authCfg', 'consent']);
const MONEY_DOCS = new Set(['pricing', 'plans', 'stock', 'freeDays', 'defaultPlan', 'gwInfo', 'gwFee', 'gwGst', 'gwPlan', 'subs', 'priceLog', 'provBal']);

export const pageOk = (r: StaffRole, page: string) => r.pages === '*' || r.pages.includes(page);

/** Same rule as the screens: an unknown role counts as Support, and the Owner role can't be narrowed. */
export async function staffRole(db: { platformDoc: { findUnique: (a: any) => Promise<any> } }, s: Scope): Promise<StaffRole | null> {
  if (s.kind !== 'platform') return null;
  const key = ROLES[s.user?.platformRole] ? s.user.platformRole : 'support';
  if (key === 'owner') return { ...ROLES.owner, owner: true };
  const custom: any = (await db.platformDoc.findUnique({ where: { key: 'roleCfg' } }))?.data ?? {};
  return { ...ROLES[key], ...(custom[key] ?? {}), owner: false };
}

export function mayWriteDoc(r: StaffRole, key: string) {
  if (r.owner) return true;
  if (OWNER_DOCS.has(key)) return false;
  if (key === 'coupons') return r.money || pageOk(r, 'coupons');
  return !MONEY_DOCS.has(key) || r.money;
}
