import { useMemo, useRef, useState } from 'preact/hooks';
import {
  BackupError,
  buildRestoreLink,
  copyBackupToClipboard,
  decodeLedgerHash,
  downloadBackup,
  readBackupFile,
  restoreBackup,
} from '../../store/backupService';
import {
  SyncError,
  useSyncService,
  type SyncErrorCode,
  type SyncStatus,
} from '../../store/syncService';
import type { IponStore } from '../../store/useIponStore';
import { BottomSheet } from './BottomSheet';

export const SYNC_STATUS_LABEL: Record<SyncStatus, string> = {
  disabled: 'Local Only',
  unpaired: 'Not Paired',
  connecting: 'Connecting…',
  offline: 'Offline / Queued',
  syncing: 'Syncing…',
  synced: 'Live Synced',
  error: 'Sync Error',
};

export const SYNC_STATUS_TONE: Record<SyncStatus, string> = {
  disabled: 'bg-sea-elevated text-ink-mist border border-brass-hairline',
  unpaired: 'bg-sea-elevated text-ink-mist border border-brass-hairline',
  connecting: 'bg-berry-gold/20 text-berry-gold border border-berry-gold/40',
  offline: 'bg-amber-500/20 text-amber-300 border border-amber-400/40',
  syncing: 'bg-claire-teal/20 text-claire-teal border border-claire-teal/40',
  synced: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40',
  error: 'bg-joel-crimson/20 text-joel-crimson border border-joel-crimson/50',
};

const ERROR_TEXT: Record<SyncErrorCode, string> = {
  'invalid-room': 'Room code must be 4–12 letters or digits.',
  'invalid-pin': 'PIN must be exactly 4 digits.',
  'room-not-found': 'That room does not exist yet. Create it first.',
  'room-taken': 'That room code is already taken.',
  'wrong-pin': 'Incorrect PIN for this room.',
  'permission-denied': 'Access denied. Check your database rules or re-pair.',
  'auth-disabled': 'Enable Anonymous sign-in in Firebase Authentication.',
  'unauthorized-domain': 'Add this domain to Firebase Auth → Authorized domains.',
  offline: 'You appear to be offline. Try again when connected.',
  unavailable: 'Sync is unavailable on this device.',
  unknown: 'Something went wrong. Please try again.',
};

function describeError(err: unknown): string {
  if (err instanceof SyncError) {
    if (err.code === 'unknown' && err.message) return err.message;
    return ERROR_TEXT[err.code];
  }
  if (err instanceof BackupError || err instanceof Error) return err.message;
  return String(err);
}

const btn =
  'flex-1 rounded-xl px-3 py-2.5 text-xs font-bold disabled:opacity-50 active:scale-[0.98] transition-transform';
const input =
  'w-full rounded-xl bg-sea-abyss border border-brass-hairline px-3 py-2.5 text-sm font-semibold text-ink-ivory placeholder:text-ink-mist/60 tabular-nums focus:outline-none focus:ring-2 focus:ring-berry-gold/70';

export interface SyncRoomModalProps {
  open: boolean;
  onClose: () => void;
  store: IponStore;
}

export function SyncRoomModal({ open, onClose, store }: SyncRoomModalProps) {
  const sync = useSyncService();
  const status = sync.status.value;
  const room = sync.pairing.value;
  const syncError = sync.error.value;
  const pendingCount = sync.pendingCount.value;

  const [roomCode, setRoomCode] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const linkDays = useMemo(
    () => (typeof location === 'undefined' ? null : decodeLedgerHash(location.hash)),
    [],
  );
  const [linkPending, setLinkPending] = useState(linkDays !== null);

  const run = async (task: () => Promise<string | void> | string | void) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await task();
      if (result) setMessage(result);
    } catch (err) {
      console.error('[sync]', err);
      setMessage(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  const pair = (mode: 'create' | 'join') =>
    run(async () => {
      const paired = await (mode === 'create'
        ? sync.createRoom(roomCode, pin)
        : sync.joinRoom(roomCode, pin));
      setPin('');
      return `Paired to room ${paired.roomCode}.`;
    });

  const onFile = (e: Event) => {
    const target = e.currentTarget as HTMLInputElement;
    const file = target.files?.[0];
    target.value = '';
    if (!file) return;
    void run(async () => {
      restoreBackup(store, await readBackupFile(file), 'merge');
      return 'Backup merged. No existing deposits were removed.';
    });
  };

  const restoreFromLink = () =>
    run(() => {
      if (linkDays) restoreBackup(store, { days: linkDays, notes: {} }, 'merge');
      history.replaceState(null, '', location.pathname + location.search);
      setLinkPending(false);
      return 'Link snapshot merged.';
    });

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Den Den Mushi Sync"
      subtitle="Live 2-phone Firebase sync & JSON backups"
      headerBadge={
        <span class={`px-2 py-0.5 rounded-full text-[11px] font-bold ${SYNC_STATUS_TONE[status]}`}>
          {SYNC_STATUS_LABEL[status]}
          {pendingCount > 0 ? ` • ${pendingCount}` : ''}
        </span>
      }
    >
      <div class="space-y-4">
        {/* Room Pairing Panel */}
        <div class="rounded-2xl bg-sea-elevated/70 border border-brass-hairline p-3.5 space-y-3">
          <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-berry-gold">
            2-Phone Room Pairing
          </p>

          {status === 'disabled' && (
            <p class="text-xs font-medium text-ink-mist">
              Firebase is not configured. Your savings are stored on this device only.
            </p>
          )}

          {status !== 'disabled' && !room && (
            <div class="space-y-2.5">
              <div class="grid grid-cols-[1fr_96px] gap-2">
                <input
                  class={`${input} uppercase`}
                  placeholder="Room code (e.g. SH2026)"
                  value={roomCode}
                  maxLength={12}
                  autoCapitalize="characters"
                  autoComplete="off"
                  onInput={(e) =>
                    setRoomCode(e.currentTarget.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                  }
                />
                <input
                  class={input}
                  placeholder="PIN"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onInput={(e) => setPin(e.currentTarget.value.replace(/\D/g, '').slice(0, 4))}
                />
              </div>
              <div class="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => pair('join')}
                  class={`${btn} bg-berry-gold text-sea-abyss font-extrabold`}
                >
                  Join Room
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => pair('create')}
                  class={`${btn} bg-sea-midnight border border-brass-hairline text-ink-ivory`}
                >
                  Create Room
                </button>
              </div>
            </div>
          )}

          {room && (
            <div class="flex items-center justify-between text-xs font-semibold text-ink-mist">
              <span>
                Room <span class="font-extrabold text-ink-ivory">{room.roomCode}</span>
              </span>
              <div class="flex gap-3">
                {syncError && (
                  <button type="button" onClick={sync.retry} class="font-bold text-claire-teal">
                    Retry
                  </button>
                )}
                <button type="button" onClick={sync.unpair} class="font-bold text-joel-crimson">
                  Unpair
                </button>
              </div>
            </div>
          )}

          {syncError && (
            <p class="text-xs font-semibold text-joel-crimson">{describeError(syncError)}</p>
          )}
        </div>

        {/* JSON & Link Backup Panel */}
        <div class="rounded-2xl bg-sea-elevated/70 border border-brass-hairline p-3.5 space-y-2.5">
          <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-berry-gold">
            Backup &amp; Restore
          </p>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => (await copyBackupToClipboard(store), 'Backup copied to clipboard.'))
              }
              class={`${btn} bg-sea-midnight border border-brass-hairline text-ink-ivory`}
            >
              Copy JSON
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => (downloadBackup(store), 'Backup downloaded.'))}
              class={`${btn} bg-sea-midnight border border-brass-hairline text-ink-ivory`}
            >
              Download JSON
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              class={`${btn} bg-sea-midnight border border-brass-hairline text-ink-ivory`}
            >
              Restore File
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  if (!navigator.clipboard) throw new BackupError('Clipboard is not available.');
                  await navigator.clipboard.writeText(buildRestoreLink(store));
                  return 'Restore link copied.';
                })
              }
              class={`${btn} bg-sea-midnight border border-brass-hairline text-ink-ivory`}
            >
              Copy Share Link
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            class="hidden"
            onChange={onFile}
          />
        </div>

        {linkPending && (
          <button
            type="button"
            disabled={busy}
            onClick={restoreFromLink}
            class={`${btn} w-full bg-berry-gold text-sea-abyss font-extrabold`}
          >
            Merge Deposits From Shared Link
          </button>
        )}

        {message && (
          <p class="rounded-xl bg-sea-abyss border border-brass-hairline px-3 py-2 text-xs font-semibold text-ink-ivory">
            {message}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
