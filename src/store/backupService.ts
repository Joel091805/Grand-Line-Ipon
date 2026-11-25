import type { DaysMap, ImportMode, PersistedIponState } from '../types/ipon';
import { DATE_KEYS_2026, DAYS_IN_YEAR, dateKeyFromDate } from '../utils/calendar2026';
import { SCHEMA_VERSION, deserializeState, type IponStore } from './useIponStore';

export const BACKUP_APP_ID = 'grand-line-ipon';

export interface IponBackup extends PersistedIponState {
  app: typeof BACKUP_APP_ID;
  exportedAt: string;
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

export function createBackup(store: IponStore, at: Date = new Date()): IponBackup {
  return {
    app: BACKUP_APP_ID,
    version: SCHEMA_VERSION,
    exportedAt: at.toISOString(),
    days: store.days.peek(),
    notes: store.notes.peek(),
    updatedAt: store.updatedAt.peek(),
    lastActor: store.lastActor.peek(),
  };
}

export function serializeBackup(store: IponStore, at?: Date): string {
  return JSON.stringify(createBackup(store, at), null, 2);
}

export function parseBackup(text: string): PersistedIponState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupError('Backup is not valid JSON.');
  }
  if (typeof parsed !== 'object' || parsed === null || !('days' in parsed)) {
    throw new BackupError('This file is not a Grand Line Ipon backup.');
  }
  const app = (parsed as { app?: unknown }).app;
  if (app !== undefined && app !== BACKUP_APP_ID) throw new BackupError('This file is not a Grand Line Ipon backup.');
  const result = deserializeState(text);
  if (result.status === 'unsupported') throw new BackupError('Backup was made by a newer app version.');
  if (result.status !== 'ok') throw new BackupError('Backup is corrupt.');
  return result.state;
}

export async function copyBackupToClipboard(store: IponStore): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) throw new BackupError('Clipboard is not available.');
  await navigator.clipboard.writeText(serializeBackup(store));
}

export function downloadBackup(store: IponStore, filename = `grand-line-ipon-${dateKeyFromDate()}.json`): void {
  const url = URL.createObjectURL(new Blob([serializeBackup(store)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function readBackupFile(file: Blob): Promise<PersistedIponState> {
  return parseBackup(await file.text());
}

export function restoreBackup(
  store: IponStore,
  state: Pick<PersistedIponState, 'days' | 'notes'>,
  mode: ImportMode = 'merge',
): void {
  store.restoreState(state, mode);
}

const HASH_PATTERN = /^#?ipon=1\.([A-Za-z0-9_-]+)$/;
const HASH_BYTES = Math.ceil((DAYS_IN_YEAR * 2) / 8);

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
}

/** Compact URL-hash snapshot of every deposit (≈125 chars for the whole year). */
export function encodeLedgerHash(days: DaysMap): string {
  const bytes = new Uint8Array(HASH_BYTES);
  const setBit = (i: number) => (bytes[i >> 3] |= 1 << (i & 7));
  DATE_KEYS_2026.forEach((key, i) => {
    if (days[key]?.j === 1) setBit(i);
    if (days[key]?.m === 1) setBit(DAYS_IN_YEAR + i);
  });
  return `#ipon=1.${toBase64Url(bytes)}`;
}

export function decodeLedgerHash(hash: string, ts: number = Date.now()): DaysMap | null {
  const match = HASH_PATTERN.exec(hash.trim());
  if (!match) return null;
  let bytes: Uint8Array;
  try {
    bytes = fromBase64Url(match[1]);
  } catch {
    return null;
  }
  if (bytes.length !== HASH_BYTES) return null;
  const bit = (i: number) => ((bytes[i >> 3] >> (i & 7)) & 1) as 0 | 1;
  const days: DaysMap = {};
  DATE_KEYS_2026.forEach((key, i) => {
    const j = bit(i);
    const m = bit(DAYS_IN_YEAR + i);
    if (j || m) days[key] = { j, m, ts };
  });
  return days;
}

export function buildRestoreLink(store: IponStore, href: string = location.href): string {
  return `${href.split('#')[0]}${encodeLedgerHash(store.days.peek())}`;
}
