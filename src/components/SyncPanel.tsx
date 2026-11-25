import { useMemo, useRef, useState } from 'preact/hooks';
import {
  BackupError,
  buildRestoreLink,
  copyBackupToClipboard,
  decodeLedgerHash,
  downloadBackup,
  readBackupFile,
  restoreBackup,
} from '../store/backupService';
import { SyncError, useSyncService, type SyncErrorCode, type SyncStatus } from '../store/syncService';
import { useIponStore } from '../store/useIponStore';

const STATUS_LABEL: Record<SyncStatus, string> = {
  disabled: 'Local Only',
  unpaired: 'Not Paired',
  connecting: 'Connecting…',
  offline: 'Offline / Queued',
  syncing: 'Syncing…',
  synced: 'Live Synced',
  error: 'Sync Error',
};

const STATUS_TONE: Record<SyncStatus, string> = {
  disabled: 'bg-gray-100 text-ink-muted',
  unpaired: 'bg-gray-100 text-ink-muted',
  connecting: 'bg-amber-100 text-amber-800',
  offline: 'bg-amber-100 text-amber-800',
  syncing: 'bg-sky-100 text-sky-800',
  synced: 'bg-emerald-100 text-emerald-800',
  error: 'bg-red-100 text-red-700',
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

const button = 'flex-1 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50';
const input =
  'w-full rounded-xl border border-border-hairline px-3 py-2 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-ocean-mid';

export function SyncPanel() {
  const store = useIponStore();
  const sync = useSyncService();
  const status = sync.status.value;
  const room = sync.pairing.value;
  const syncError = sync.error.value;

  const [roomCode, setRoomCode] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const linkDays = useMemo(() => (typeof location === 'undefined' ? null : decodeLedgerHash(location.hash)), []);
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
      const paired = await (mode === 'create' ? sync.createRoom(roomCode, pin) : sync.joinRoom(roomCode, pin));
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
    <section class="bg-card-surface border border-border-hairline rounded-2xl p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Den Den Mushi Sync</h2>
        <span class={`px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_TONE[status]}`}>
          {STATUS_LABEL[status]}
          {sync.pendingCount.value > 0 && ` • ${sync.pendingCount.value}`}
        </span>
      </div>

      {status === 'disabled' && (
        <p class="text-xs text-ink-muted">Firebase is not configured. Your savings are stored on this device only.</p>
      )}

      {status !== 'disabled' && !room && (
        <div class="space-y-2">
          <div class="grid grid-cols-[1fr_96px] gap-2">
            <input
              class={`${input} uppercase`}
              placeholder="Room code (e.g. SH2026)"
              value={roomCode}
              maxLength={12}
              autoCapitalize="characters"
              autoComplete="off"
              onInput={(e) => setRoomCode(e.currentTarget.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
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
            <button type="button" disabled={busy} onClick={() => pair('join')} class={`${button} bg-ocean-deep text-white`}>
              Join Room
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => pair('create')}
              class={`${button} border border-border-hairline text-ink-primary`}
            >
              Create Room
            </button>
          </div>
        </div>
      )}

      {room && (
        <div class="flex items-center justify-between text-xs font-semibold text-ink-muted">
          <span>
            Room <span class="font-extrabold text-ink-primary">{room.roomCode}</span>
          </span>
          <div class="flex gap-3">
            {syncError && (
              <button type="button" onClick={sync.retry} class="font-bold text-ocean-mid">
                Retry
              </button>
            )}
            <button type="button" onClick={sync.unpair} class="font-bold text-joel-crimson">
              Unpair
            </button>
          </div>
        </div>
      )}

      {syncError && <p class="text-xs font-semibold text-red-700">{describeError(syncError)}</p>}

      <div class="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(async () => (await copyBackupToClipboard(store), 'Backup copied to clipboard.'))}
          class={`${button} border border-border-hairline`}
        >
          Copy JSON
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => (downloadBackup(store), 'Backup downloaded.'))}
          class={`${button} border border-border-hairline`}
        >
          Download
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          class={`${button} border border-border-hairline`}
        >
          Restore
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
          class={`${button} border border-border-hairline`}
        >
          Link
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" class="hidden" onChange={onFile} />
      </div>

      {linkPending && (
        <button type="button" disabled={busy} onClick={restoreFromLink} class={`${button} w-full bg-berry-gold text-ink-primary`}>
          Merge deposits from this link
        </button>
      )}

      {message && <p class="text-xs font-semibold text-ink-muted">{message}</p>}
    </section>
  );
}
