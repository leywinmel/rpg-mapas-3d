import { describe, expect, it } from 'vitest';
import { SHORTCUT_HELP, shortcutCommand, TOOL_KEYS, type KeyInput } from './shortcuts';

function key(value: string, modifiers: Partial<KeyInput> = {}): KeyInput {
  return {
    key: value,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...modifiers,
  };
}

describe('shortcuts', () => {
  it('shouldMapUndoAndBothRedoCombinations', () => {
    expect(shortcutCommand(key('z', { ctrlKey: true }))).toEqual({ type: 'undo' });
    expect(shortcutCommand(key('Z', { ctrlKey: true, shiftKey: true }))).toEqual({ type: 'redo' });
    expect(shortcutCommand(key('y', { ctrlKey: true }))).toEqual({ type: 'redo' });
    expect(shortcutCommand(key('z', { metaKey: true }))).toEqual({ type: 'undo' });
  });

  it('shouldMapToolKeysRotateDeleteAndEscape', () => {
    expect(shortcutCommand(key('e'))).toEqual({ type: 'tool', tool: 'erase' });
    expect(shortcutCommand(key(']'))).toEqual({ type: 'tool', tool: 'raise' });
    expect(shortcutCommand(key('R'))).toEqual({ type: 'rotate' });
    expect(shortcutCommand(key('Delete'))).toEqual({ type: 'delete' });
    expect(shortcutCommand(key('Escape'))).toEqual({ type: 'escape' });
  });

  it('shouldMoveTheSelectedPieceWithShiftPageUpAndDown', () => {
    expect(shortcutCommand(key('PageUp', { shiftKey: true }))).toEqual({ type: 'level', delta: 1 });
    expect(shortcutCommand(key('PageDown', { shiftKey: true }))).toEqual({
      type: 'level',
      delta: -1,
    });
    // Sem Shift, Page Up/Down é o corte de andares, que tem o próprio tratador.
    expect(shortcutCommand(key('PageUp'))).toBeNull();
  });

  it('shouldLeaveOtherKeysAndBrowserShortcutsAlone', () => {
    expect(shortcutCommand(key('q'))).toBeNull();
    expect(shortcutCommand(key('c', { ctrlKey: true }))).toBeNull();
    expect(shortcutCommand(key('e', { altKey: true }))).toBeNull();
  });

  it('shouldDocumentEveryToolKey', () => {
    const documented = SHORTCUT_HELP.map((item) => item.keys);
    expect(documented).toEqual(expect.arrayContaining(Object.values(TOOL_KEYS)));
  });
});
