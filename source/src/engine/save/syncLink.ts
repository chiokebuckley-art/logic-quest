/** A player's link to cloud sync, and the shape of a sync code. Kept apart so save.ts and sync.ts do not import each other. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 12;
export const validCode = (s: string) => new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`).test(s);

/** A player's link to the cloud: its code, the revision this device last saw, and that save's time. */
export interface SyncLink { code: string; rev: number; at: number }

/** A stored link, checked: a valid code, a whole revision and a time. Anything else is dropped. */
export function parseLink(x: unknown): SyncLink | undefined {
  if (!x || typeof x !== 'object') return undefined;
  const o = x as Record<string, unknown>;
  if (typeof o.code !== 'string' || !validCode(o.code)) return undefined;
  const rev = Number.isInteger(o.rev) && (o.rev as number) >= 0 ? (o.rev as number) : 0;
  const at = typeof o.at === 'number' && Number.isFinite(o.at) && o.at >= 0 ? o.at : 0;
  return { code: o.code, rev, at };
}
