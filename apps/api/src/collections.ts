// Which parts of the app's data live in which table, and what each kind of user may read.

export type Col =
  | 'users' | 'accounts' | 'events' | 'eventUsers' | 'moi' | 'expenses' | 'payouts' | 'guests'
  | 'ggroups' | 'reminders' | 'tickets' | 'stockAlerts' | 'leads' | 'msgLog' | 'notifications' | 'audit';

/** Prisma model for each collection. */
export const MODEL: Record<Col, string> = {
  users: 'user', accounts: 'account', events: 'event', eventUsers: 'eventUser', moi: 'moi',
  expenses: 'expense', payouts: 'payout', guests: 'guest', ggroups: 'guestGroup', reminders: 'reminder',
  tickets: 'ticket', stockAlerts: 'stockAlert', leads: 'lead', msgLog: 'msgLog', notifications: 'notification', audit: 'audit',
};

/** Applied in this order, so a new event exists before the Moi entries that point at it. */
export const PUSH_ORDER: Col[] = [
  'users', 'accounts', 'events', 'eventUsers', 'moi', 'expenses', 'payouts', 'guests', 'ggroups',
  'reminders', 'tickets', 'stockAlerts', 'leads', 'msgLog', 'notifications', 'audit',
];

/** These sit inside `platform` in the browser but are real tables here. */
export const PLATFORM_ARRAYS: Partial<Record<Col, string>> = { tickets: 'tickets', stockAlerts: 'stockAlerts', leads: 'leads' };

/** Settings anyone may read, including visitors who are not logged in. */
export const PUBLIC_DOCS = [
  'plans', 'pricing', 'stock', 'freeDays', 'defaultPlan', 'site', 'web', 'reviews', 'blog', 'videos',
  'gwInfo', 'gwFee', 'gwGst', 'gwPlan', 'authCfg', 'consent', 'v22', 'v23', 'v24', 'v42',
];

/** Extra settings a logged-in customer needs. */
export const TENANT_DOCS = [...PUBLIC_DOCS, 'announcements', 'coupons'];

/** One-time flags the browser code checks. The stored data is already migrated, so all are on. */
export const STATE_FLAGS = { evNo3: 1, moiNo2: 1, v31msg: 1, v45: 1, v46: 1, v50: 1, v54: 1, pplV45: 1 };
