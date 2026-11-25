import type { SyncBackend } from '../store/syncService';

type Node = Record<string, unknown>;
const TS = { '.sv': 'timestamp' };

const split = (path: string) => path.split('/').filter(Boolean);
const clone = <T>(v: T): T => (v === undefined ? v : structuredClone(v));

function getAt(root: Node, path: string): unknown {
  let cur: unknown = root;
  for (const seg of split(path)) {
    if (typeof cur !== 'object' || cur === null) return null;
    cur = (cur as Node)[seg];
  }
  return cur ?? null;
}

function setAt(root: Node, path: string, value: unknown): void {
  const segs = split(path);
  const stack: Node[] = [root];
  let cur = root;
  for (const seg of segs.slice(0, -1)) {
    if (typeof cur[seg] !== 'object' || cur[seg] === null) cur[seg] = {};
    cur = cur[seg] as Node;
    stack.push(cur);
  }
  const last = segs[segs.length - 1];
  if (value === null) delete cur[last];
  else cur[last] = value;
  for (let i = segs.length - 2; i >= 0; i--) {
    if (Object.keys(stack[i + 1]).length === 0) delete stack[i][segs[i]];
  }
}

export class PermissionError extends Error {
  code = 'PERMISSION_DENIED';
  constructor() {
    super('PERMISSION_DENIED: Permission denied');
  }
}

export class FakeServer {
  data: Node = {};
  clock = 1_000_000;
  updateCalls = 0;
  clients = new Set<FakeClient>();

  private isMember(state: Node, room: string, uid: string): boolean {
    return getAt(state, `rooms/${room}/members/${uid}`) !== null;
  }

  canRead(uid: string, path: string): boolean {
    const [root, room, section, ...rest] = split(path);
    if (root !== 'rooms' || !room) return false;
    if (section === 'auth') return rest[0] === 'createdAt';
    return ['days', 'notes', 'meta'].includes(section) && this.isMember(this.data, room, uid);
  }

  apply(uid: string, base: string, values: Record<string, unknown>): void {
    const next = clone(this.data);
    const resolve = (v: unknown): unknown =>
      v && typeof v === 'object' && (v as Node)['.sv'] === 'timestamp' ? ++this.clock : v;
    for (const [rel, value] of Object.entries(values)) setAt(next, `${base}/${rel}`, clone(resolve(value)));

    for (const [rel, value] of Object.entries(values)) {
      const [, room, section, key] = split(`${base}/${rel}`);
      if (section === 'auth' && getAt(this.data, `rooms/${room}/auth`) !== null) throw new PermissionError();
      if (section === 'members') {
        if (key !== uid) throw new PermissionError();
        if (value !== null && value !== getAt(next, `rooms/${room}/auth/pinHash`)) throw new PermissionError();
      }
      if (['days', 'notes', 'meta'].includes(section) && !this.isMember(next, room, uid)) throw new PermissionError();
    }
    this.updateCalls++;
    this.data = next;
    for (const client of this.clients) client.deliver();
  }
}

export class FakeClient implements SyncBackend {
  online = true;
  private queue: Array<() => void> = [];
  private listeners = new Set<{ path: string; onData: (v: unknown) => void; onError: (e: unknown) => void }>();
  private connListeners = new Set<(c: boolean) => void>();

  constructor(
    private server: FakeServer,
    readonly uid: string,
  ) {
    server.clients.add(this);
  }

  signIn = async () => this.uid;

  read = async (path: string) => {
    await Promise.resolve();
    if (!this.online) throw new Error('Client is offline.');
    if (!this.server.canRead(this.uid, path)) throw new PermissionError();
    return clone(getAt(this.server.data, path));
  };

  update = (path: string, values: Record<string, unknown>) =>
    new Promise<void>((resolve, reject) => {
      const run = () => {
        try {
          this.server.apply(this.uid, path, values);
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      if (this.online) queueMicrotask(run);
      else this.queue.push(run);
    });

  listen = (path: string, onData: (v: unknown) => void, onError: (e: unknown) => void) => {
    const entry = { path, onData, onError };
    this.listeners.add(entry);
    queueMicrotask(() => this.deliverOne(entry));
    return () => void this.listeners.delete(entry);
  };

  onConnectionChange = (listener: (c: boolean) => void) => {
    this.connListeners.add(listener);
    listener(this.online);
    return () => void this.connListeners.delete(listener);
  };

  serverTimestamp = () => TS;

  setOnline(online: boolean): void {
    this.online = online;
    for (const l of this.connListeners) l(online);
    if (online) {
      for (const run of this.queue.splice(0)) run();
      this.deliver();
    }
  }

  disconnect(): void {
    this.online = false;
    this.server.clients.delete(this);
  }

  deliver(): void {
    if (!this.online) return;
    for (const entry of this.listeners) this.deliverOne(entry);
  }

  private deliverOne(entry: { path: string; onData: (v: unknown) => void; onError: (e: unknown) => void }): void {
    if (!this.online || !this.listeners.has(entry)) return;
    if (!this.server.canRead(this.uid, entry.path)) {
      this.listeners.delete(entry);
      entry.onError(new PermissionError());
      return;
    }
    entry.onData(clone(getAt(this.server.data, entry.path)));
  }
}
