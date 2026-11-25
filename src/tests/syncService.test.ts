import { afterEach, describe, expect, it } from 'vitest';
import { OUTBOX_KEY, PAIRING_KEY, createSyncService, hashPin, toSyncError, type SyncErrorCode } from '../store/syncService';
import { createIponStore, type StorageLike } from '../store/useIponStore';
import { FakeClient, FakeServer } from './fakeBackend';

function memoryStorage(): StorageLike & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => void (data[k] = v),
    removeItem: (k) => void delete data[k],
  };
}

const settle = async () => {
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0));
};

const stops: Array<() => void> = [];
afterEach(() => stops.splice(0).forEach((s) => s()));

function device(server: FakeServer, uid: string, storage = memoryStorage(), backend?: FakeClient | null) {
  const client = backend === undefined ? new FakeClient(server, uid) : backend;
  const store = createIponStore({ storage, today: () => '2026-11-23', now: () => 1000 });
  const sync = createSyncService({ store, storage, backend: async () => client, timeoutMs: 500, retryMs: 20 });
  stops.push(sync.start());
  return { storage, client: client as FakeClient, store, sync };
}

async function expectCode(promise: Promise<unknown>, code: SyncErrorCode) {
  await expect(promise).rejects.toMatchObject({ code });
}

async function pairedPair(server = new FakeServer()) {
  const a = device(server, 'uid-a');
  const b = device(server, 'uid-b');
  await a.sync.createRoom('sh2026', '1234');
  await b.sync.joinRoom('SH2026', '1234');
  await settle();
  return { server, a, b };
}

describe('hashPin', () => {
  it('produces a salted 64-char hex digest', async () => {
    const h = await hashPin('SH2026', '1234');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashPin('SH2026', '1234')).toBe(h);
    expect(await hashPin('OTHER1', '1234')).not.toBe(h);
  });

  it('maps Firebase auth and network errors to specific SyncError codes', () => {
    expect(toSyncError({ code: 'auth/operation-not-allowed', message: 'Disabled' }).code).toBe('auth-disabled');
    expect(toSyncError({ code: 'auth/configuration-not-found', message: 'Not configured' }).code).toBe('auth-disabled');
    expect(toSyncError({ code: 'auth/unauthorized-domain', message: 'Bad domain' }).code).toBe('unauthorized-domain');
    expect(toSyncError({ code: 'auth/api-key-not-valid.-please-pass-a-valid-api-key.', message: 'Bad key' }).code).toBe(
      'unavailable',
    );
    expect(toSyncError({ code: 'auth/network-request-failed', message: 'Network error' }).code).toBe('offline');
    expect(toSyncError({ code: 'PERMISSION_DENIED', message: 'Permission denied' }).code).toBe('permission-denied');
  });
});

describe('syncService pairing', () => {
  it('creates a room, pushes the local ledger and lets the partner join', async () => {
    const server = new FakeServer();
    const a = device(server, 'uid-a');
    a.store.applyDefaultImport();
    a.store.setNote('2026-11', 'Final stretch');
    await a.sync.createRoom('sh2026', '1234');
    await settle();
    expect(a.sync.status.value).toBe('synced');

    const b = device(server, 'uid-b');
    await b.sync.joinRoom('SH2026', '1234');
    await settle();
    expect(b.store.combinedTotal.value).toBe(26950);
    expect(b.store.notes.value['2026-11']).toBe('Final stretch');
    expect(b.sync.status.value).toBe('synced');
    expect(JSON.parse(b.storage.data[PAIRING_KEY]).roomCode).toBe('SH2026');
  });

  it('rejects bad input, missing rooms, taken codes and wrong PINs', async () => {
    const server = new FakeServer();
    const a = device(server, 'uid-a');
    const b = device(server, 'uid-b');
    await expectCode(a.sync.createRoom('x', '1234'), 'invalid-room');
    await expectCode(a.sync.createRoom('SH2026', '12a4'), 'invalid-pin');
    await expectCode(b.sync.joinRoom('NOPE99', '1234'), 'room-not-found');
    await a.sync.createRoom('SH2026', '1234');
    await expectCode(b.sync.createRoom('SH2026', '9999'), 'room-taken');
    await expectCode(b.sync.joinRoom('SH2026', '9999'), 'wrong-pin');
    expect(b.sync.status.value).toBe('unpaired');
    expect(server.data).not.toHaveProperty('rooms.SH2026.members.uid-b');
  });

  it('reports disabled when Firebase is not configured', async () => {
    const d = device(new FakeServer(), 'uid-a', memoryStorage(), null);
    await settle();
    expect(d.sync.status.value).toBe('disabled');
    await expectCode(d.sync.joinRoom('SH2026', '1234'), 'unavailable');
  });

  it('unpairs without touching local savings', async () => {
    const { a } = await pairedPair();
    a.store.setPaid('2026-11-23', 'j', true);
    await settle();
    a.sync.unpair();
    expect(a.sync.status.value).toBe('unpaired');
    expect(a.store.joelTotal.value).toBe(50);
    expect(a.storage.data[PAIRING_KEY]).toBeUndefined();
    expect(a.storage.data[OUTBOX_KEY]).toBeUndefined();
  });
});

describe('syncService conflict-free writes', () => {
  it('merges simultaneous taps on the same date from both phones', async () => {
    const { server, a, b } = await pairedPair();
    a.store.setPaid('2026-11-23', 'j', true);
    b.store.setPaid('2026-11-23', 'm', true);
    await settle();
    for (const d of [a, b]) {
      expect(d.store.days.value['2026-11-23']).toMatchObject({ j: 1, m: 1 });
    }
    expect(server.data).toMatchObject({ rooms: { SH2026: { days: { '2026-11-23': { j: 1, m: 1 } } } } });
  });

  it('reconciles offline taps with online partner taps on reconnect', async () => {
    const { a, b } = await pairedPair();
    a.client.setOnline(false);
    a.store.setPaid('2026-11-23', 'j', true);
    a.store.setPaid('2026-11-24', 'j', true);
    b.store.setPaid('2026-11-23', 'm', true);
    b.store.setPaid('2026-11-25', 'm', true);
    await settle();
    expect(a.sync.status.value).toBe('offline');
    expect(a.sync.pendingCount.value).toBe(2);
    expect(a.store.days.value['2026-11-24']?.j).toBe(1);

    a.client.setOnline(true);
    await settle();
    for (const d of [a, b]) {
      expect(d.store.claireTotal.value).toBe(100);
      expect(d.store.joelTotal.value).toBe(100);
      expect(d.store.days.value['2026-11-23']).toMatchObject({ j: 1, m: 1 });
    }
    expect(a.sync.pendingCount.value).toBe(0);
    expect(a.sync.status.value).toBe('synced');
  });

  it('keeps offline deposits across an app reload via the persisted outbox', async () => {
    const { server, a, b } = await pairedPair();
    a.client.setOnline(false);
    a.store.setPaid('2026-11-20', 'm', true);
    await settle();
    a.sync.stop();
    a.client.disconnect();

    const reloaded = device(server, 'uid-a', a.storage);
    expect(reloaded.store.days.value['2026-11-20']?.m).toBe(1);
    await settle();
    expect(b.store.days.value['2026-11-20']?.m).toBe(1);
    expect(reloaded.sync.pendingCount.value).toBe(0);
  });

  it('sends a Habulin or Excel batch as one atomic update', async () => {
    const { server, a, b } = await pairedPair();
    const before = server.updateCalls;
    a.store.applyDefaultImport();
    await settle();
    expect(server.updateCalls - before).toBe(1);
    expect(b.store.combinedTotal.value).toBe(26950);

    const beforeSettle = server.updateCalls;
    b.store.settleOldest('m', 'all');
    await settle();
    expect(server.updateCalls - beforeSettle).toBe(1);
    expect(a.store.habulinArrears.value.hasArrears).toBe(false);
  });

  it('syncs monthly notes and un-marking a deposit', async () => {
    const { a, b } = await pairedPair();
    a.store.setPaid('2026-11-01', 'j', true);
    a.store.setNote('2026-11', 'Robin approves');
    await settle();
    b.store.setPaid('2026-11-01', 'j', false);
    await settle();
    expect(a.store.days.value['2026-11-01']?.j).toBe(0);
    expect(b.store.notes.value['2026-11']).toBe('Robin approves');
  });
});
