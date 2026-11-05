import { Injectable } from '@nestjs/common';
import { createPublicKey, createVerify, type KeyObject } from 'node:crypto';
import { cfg } from './config';
import { fail } from './util';

export interface GoogleUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

/** A few seconds' allowance, because the phone's clock and the server's are never exactly equal. */
const SKEW_SECONDS = 60;

/**
 * Checks a Firebase sign-in token the way Firebase documents it, using Google's published signing keys.
 * Only the server decides who someone is: the browser just hands over the token Google gave it.
 * Uses Node's own crypto, so no Firebase server package or service account key is needed.
 */
@Injectable()
export class FirebaseService {
  private keys: { at: number; maxAge: number; byKid: Map<string, KeyObject> } | null = null;

  get enabled() {
    return !!(cfg.firebase.projectId && cfg.firebase.apiKey && cfg.firebase.authDomain);
  }

  /** What the browser needs to start Google sign-in. All of it is public by design. */
  webConfig() {
    const f = cfg.firebase;
    return this.enabled ? { apiKey: f.apiKey, authDomain: f.authDomain, projectId: f.projectId, ...(f.appId ? { appId: f.appId } : {}) } : null;
  }

  private async signingKeys(force = false) {
    const fresh = this.keys && Date.now() - this.keys.at < this.keys.maxAge;
    if (fresh && !force) return this.keys!.byKid;
    const res = await fetch(cfg.firebase.certsUrl, { signal: AbortSignal.timeout(10000) }).catch(() => null);
    if (!res?.ok) return fail('Google sign-in is unavailable right now. Please try again.', 503);
    const body: any = await res.json();
    const byKid = new Map<string, KeyObject>();
    for (const jwk of body.keys ?? []) if (jwk.kid && jwk.kty === 'RSA') byKid.set(jwk.kid, createPublicKey({ key: jwk, format: 'jwk' }));
    const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') || '')?.[1] || 3600) * 1000;
    this.keys = { at: Date.now(), maxAge, byKid };
    return byKid;
  }

  async verify(idToken: string): Promise<GoogleUser> {
    if (!this.enabled) return fail('Google sign-in is not set up on this server.', 503);
    const bad = (why = 'Google sign-in failed. Please try again.') => fail(why, 401);
    const parts = String(idToken || '').split('.');
    if (parts.length !== 3) return bad();
    let header: any;
    let claims: any;
    try {
      header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
      claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    } catch {
      return bad();
    }
    if (header.alg !== 'RS256' || !header.kid) return bad();
    let key = (await this.signingKeys()).get(header.kid);
    // Google rotates its keys, so an unknown one means fetch the list again once
    if (!key) key = (await this.signingKeys(true)).get(header.kid);
    if (!key) return bad();
    const ok = createVerify('RSA-SHA256').update(`${parts[0]}.${parts[1]}`).verify(key, Buffer.from(parts[2], 'base64url'));
    if (!ok) return bad();

    const now = Math.floor(Date.now() / 1000);
    const project = cfg.firebase.projectId;
    if (claims.aud !== project || claims.iss !== `https://securetoken.google.com/${project}`) return bad();
    if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128) return bad();
    if (!(claims.exp > now - SKEW_SECONDS)) return bad('Your Google sign-in has expired. Please sign in again.');
    if (!(claims.iat <= now + SKEW_SECONDS) || !(claims.auth_time <= now + SKEW_SECONDS)) return bad();
    if (claims.firebase?.sign_in_provider !== 'google.com') return bad('Please use Sign in with Google.');
    return { uid: claims.sub, email: String(claims.email || '').trim().toLowerCase(), emailVerified: claims.email_verified === true, name: String(claims.name || '').slice(0, 120) };
  }
}
