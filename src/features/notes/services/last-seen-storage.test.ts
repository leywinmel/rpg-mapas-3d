// @vitest-environment jsdom
import { setLogSink, type LogEntry } from '@/lib/logger';
import {
  browserStorage,
  lastSeenKey,
  readLastSeen,
  writeLastSeen,
  type LastSeenStorage,
} from './last-seen-storage';

const USER = 'user-1';
const ROOM = 'room-1';
const SEEN = '2026-11-01T18:10:00+00:00';

function memoryStorage(initial: Record<string, string> = {}): LastSeenStorage & {
  data: Map<string, string>;
} {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

function brokenStorage(): LastSeenStorage {
  const fail = () => {
    throw new DOMException('cheio ou bloqueado', 'QuotaExceededError');
  };
  return { getItem: fail, setItem: fail };
}

function captureLogs(): LogEntry[] {
  const entries: LogEntry[] = [];
  setLogSink((entry) => entries.push(entry));
  return entries;
}

describe('last seen storage', () => {
  it('shouldKeepOneEntryPerPersonAndPerRoom', () => {
    expect(lastSeenKey('a', 'r1')).not.toBe(lastSeenKey('b', 'r1'));
    expect(lastSeenKey('a', 'r1')).not.toBe(lastSeenKey('a', 'r2'));
  });

  it('shouldWriteAndReadBackTheLastSeenMoment', () => {
    const storage = memoryStorage();
    expect(readLastSeen(storage, USER, ROOM)).toBeNull();
    writeLastSeen(storage, USER, ROOM, SEEN);
    expect(readLastSeen(storage, USER, ROOM)).toBe(SEEN);
    expect(readLastSeen(storage, 'other-user', ROOM)).toBeNull();
  });

  it('shouldTreatACorruptedValueAsNeverSeen', () => {
    const storage = memoryStorage({ [lastSeenKey(USER, ROOM)]: 'lixo' });
    expect(readLastSeen(storage, USER, ROOM)).toBeNull();
  });

  it('shouldDoNothingWithoutStorage', () => {
    expect(readLastSeen(null, USER, ROOM)).toBeNull();
    expect(() => writeLastSeen(null, USER, ROOM, SEEN)).not.toThrow();
  });

  it('shouldSurviveAStorageThatThrowsAndLeaveATraceInTheLog', () => {
    const logs = captureLogs();
    const storage = brokenStorage();
    expect(readLastSeen(storage, USER, ROOM)).toBeNull();
    expect(() => writeLastSeen(storage, USER, ROOM, SEEN)).not.toThrow();
    expect(logs).toHaveLength(2);
    expect(logs.every((entry) => entry.level === 'debug')).toBe(true);
  });
});

describe('browserStorage', () => {
  it('shouldGiveTheBrowserLocalStorage', () => {
    expect(browserStorage()).toBe(window.localStorage);
  });

  it('shouldGiveNothingWhenJustReachingForTheStorageThrows', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('cookies bloqueados', 'SecurityError');
      },
    });
    try {
      expect(browserStorage()).toBeNull();
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original);
    }
  });
});
