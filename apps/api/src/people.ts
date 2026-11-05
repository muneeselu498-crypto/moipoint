/**
 * One record per guest mobile, shared by every family that guest gave Moi to.
 * The name and place can be shared, as the counter's fill-in always did. Everything else a family
 * typed stays in that family's own copy under `fam`, so no family sees another family's notes.
 */
const DETAILS = ['name', 'place', 'des', 'rel', 'address', 'alt'] as const;

/** Adds one family's details to the shared record. Only the guest can say yes to offers, and a STOP always stays. */
export function mergePerson(old: any, mobile: string, accountId: string, accounts: string[], rec: any, consent = false) {
  const at = +rec.at || Date.now();
  const mine: any = { at };
  for (const k of DETAILS) if (rec[k] != null && rec[k] !== '') mine[k] = rec[k];
  const fam = { ...(old?.fam ?? {}), [accountId]: { ...(old?.fam?.[accountId] ?? {}), ...mine } };
  const newest = at >= (+old?.at || 0);
  return {
    ...(old ?? {}), mobile, fam, accs: accounts,
    first: Math.min(+old?.first || at, +rec.first || at),
    srcs: [...new Set([...(old?.srcs ?? []), ...(rec.srcs ?? []), ...(rec.src ? [rec.src] : [])])],
    ...(newest ? { ...mine, ...(rec.src ? { src: rec.src } : {}) } : {}),
    ...(consent && !old?.optOut ? { consent: true, consentAt: Date.now() } : {}),
  };
}

/** What one family's device may see. Rows saved before `fam` existed show in full only if a single family wrote them. */
export function personFor(p: { mobile: string; accounts: string[]; data: any }, accountIds: string[]) {
  const d = p.data ?? {};
  const copies = accountIds.map((a) => d.fam?.[a]).filter(Boolean).sort((a, b) => (a.at || 0) - (b.at || 0));
  const own = copies[copies.length - 1] ?? (p.accounts.length === 1 && accountIds.includes(p.accounts[0]) ? d : {});
  return {
    mobile: p.mobile, at: d.at, first: d.first, srcs: d.srcs ?? [], src: d.src, accs: p.accounts.filter((a) => accountIds.includes(a)),
    name: own.name ?? d.name, place: own.place ?? d.place, des: own.des, rel: own.rel, address: own.address, alt: own.alt ?? d.alt,
  };
}

/** Moi Point staff see the latest details, without each family's separate copy. */
export function personForStaff(p: { data: any }) {
  const { fam, ...rest } = p.data ?? {};
  return rest;
}
