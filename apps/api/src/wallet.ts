// Message credits. These rules are moved unchanged from the browser code (walletSync,
// walletRenew, addCredits, spendCredit), so balances behave exactly as before. The difference
// is that only the server now runs them against the stored balance.
import { addDays, today, uid } from './util';

export type Wallet = any;

export const emptyWallet = (): Wallet => ({ credits: 0, used: 0, usage: {}, purchases: [] });

function renew(w: Wallet, validDays: number) {
  if (!w?.batches) return;
  const paid = (w.purchases || [])
    .filter((p: any) => p.amount > 0 && p.qty > 0)
    .map((p: any) => p.at)
    .sort();
  const last = [paid[paid.length - 1] || '', w.lastUse || ''].sort().pop();
  if (!last) return;
  const exp = addDays(last, validDays || 365);
  w.batches.forEach((b: any) => {
    if (b.left > 0 && b.exp >= last && b.exp < exp) b.exp = exp;
  });
  w.renewTill = exp;
}

export function walletSync(w: Wallet, validDays: number): Wallet {
  if (!w) return w;
  w.batches = w.batches || [];
  w.batches.forEach((b: any) => {
    if (b.paid === undefined) b.paid = !/Welcome|Free credits|by Moi Point|plan ·|test/i.test(b.kind || '');
  });
  if (!w._mig) {
    if (w.credits > 0 && !w.batches.length) {
      w.batches.push({ id: uid('b'), qty: w.credits, left: w.credits, at: today(), exp: addDays(today(), validDays || 365), kind: 'Earlier balance' });
    }
    w._mig = 1;
  }
  renew(w, validDays);
  const t = today();
  w.batches.forEach((b: any) => {
    if (b.left > 0 && b.exp < t) {
      w.expired = (w.expired || 0) + b.left;
      b.expiredN = b.left;
      b.left = 0;
    }
  });
  w.credits = w.batches.reduce((s: number, b: any) => s + b.left, 0);
  return w;
}

export function addCredits(w: Wallet, qty: number, amount: number, kind: string, ref: string, validDays: number, code?: string | null) {
  walletSync(w, validDays);
  const exp = addDays(today(), validDays || 365);
  if (qty > 0) {
    w.batches.push({ id: uid('b'), qty, left: qty, at: today(), exp, kind, paid: amount > 0 });
  } else {
    let r = -qty;
    w.batches
      .slice()
      .sort((a: any, b: any) => a.exp.localeCompare(b.exp))
      .forEach((b: any) => {
        const k = Math.min(b.left, r);
        b.left -= k;
        r -= k;
      });
  }
  w.purchases = w.purchases || [];
  w.purchases.push({ at: today(), qty, amount: amount || 0, ref: ref || '', kind: kind || '', code: code || null, exp: qty > 0 ? exp : null });
  walletSync(w, validDays);
  return w;
}

/** Takes one credit, oldest expiry first. Returns false when the balance is empty. */
export function spendCredit(w: Wallet, validDays: number): boolean {
  walletSync(w, validDays);
  const b = w.batches.filter((x: any) => x.left > 0).sort((a: any, c: any) => a.exp.localeCompare(c.exp))[0];
  if (!b) return false;
  b.left--;
  w.credits--;
  w.used = (w.used || 0) + 1;
  if (b.paid) w.usedPaid = (w.usedPaid || 0) + 1;
  else w.usedFree = (w.usedFree || 0) + 1;
  w.lastUse = today();
  renew(w, validDays);
  return true;
}

/** Same sums the buy screen shows, so the price charged always matches the price displayed. */
export function priceOf(qty: number, rate: number, gstPct: number, discountPct = 0) {
  const base = qty * rate;
  const off = discountPct ? Math.round(((base * discountPct) / 100) * 100) / 100 : 0;
  const net = base - off;
  const gst = Math.round((net - net / (1 + gstPct / 100)) * 100) / 100;
  return { base, off, net, gst, total: Math.round(net * 100) / 100 };
}
