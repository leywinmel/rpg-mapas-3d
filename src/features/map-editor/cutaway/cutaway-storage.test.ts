import { cutawayStorageKey, readOwnCutaway, writeOwnCutaway } from './cutaway-storage';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

describe('cutaway-storage', () => {
  it('shouldRememberTheCutPerRoom', () => {
    const storage = memoryStorage();
    writeOwnCutaway(storage, 'mesa-a', 8);
    writeOwnCutaway(storage, 'mesa-b', null);
    expect(readOwnCutaway(storage, 'mesa-a')).toBe(8);
    expect(readOwnCutaway(storage, 'mesa-b')).toBeNull();
    expect(readOwnCutaway(storage, 'mesa-c')).toBeNull();
  });

  it('shouldIgnoreAValueEditedByHand', () => {
    const storage = memoryStorage();
    storage.setItem(cutawayStorageKey('mesa'), '"alto"');
    expect(readOwnCutaway(storage, 'mesa')).toBeNull();
    storage.setItem(cutawayStorageKey('mesa'), '{quebrado');
    expect(readOwnCutaway(storage, 'mesa')).toBeNull();
  });

  it('shouldKeepWorkingWithoutStorage', () => {
    const broken = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(readOwnCutaway(broken, 'mesa')).toBeNull();
    expect(() => writeOwnCutaway(broken, 'mesa', 4)).not.toThrow();
    expect(readOwnCutaway(null, 'mesa')).toBeNull();
  });
});
