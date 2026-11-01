/**
 * Atalhos de teclado do editor. A mesma tabela alimenta o tratador de teclas e
 * a ajuda na tela, para a documentação nunca ficar desatualizada.
 */
import type { Tool } from './editor-reducer';

export type EditorCommand =
  | { type: 'tool'; tool: Tool }
  | { type: 'rotate' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'delete' }
  | { type: 'escape' };

export type KeyInput = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
};

export const TOOL_KEYS: Readonly<Record<Tool, string>> = {
  select: 'V',
  floor: 'C',
  wall: 'P',
  prop: 'O',
  erase: 'E',
  raise: ']',
  lower: '[',
};

export const TOOL_LABELS: Readonly<Record<Tool, string>> = {
  select: 'Selecionar',
  floor: 'Pintar chão',
  wall: 'Parede',
  prop: 'Objeto',
  erase: 'Apagar',
  raise: 'Elevar chão',
  lower: 'Abaixar chão',
};

export type ShortcutHelp = { keys: string; description: string };

export const SHORTCUT_HELP: readonly ShortcutHelp[] = [
  ...(Object.keys(TOOL_KEYS) as Tool[]).map((tool) => ({
    keys: TOOL_KEYS[tool],
    description: TOOL_LABELS[tool],
  })),
  { keys: 'R', description: 'Girar a peça (ou o objeto selecionado)' },
  { keys: 'Delete', description: 'Apagar o objeto selecionado' },
  { keys: 'Ctrl+Z', description: 'Desfazer' },
  { keys: 'Ctrl+Shift+Z ou Ctrl+Y', description: 'Refazer' },
  { keys: 'Esc', description: 'Voltar para Selecionar' },
  { keys: 'Botão direito', description: 'Girar a câmera (com uma ferramenta ativa)' },
  { keys: 'Botão do meio', description: 'Arrastar a câmera' },
  { keys: 'Roda do mouse', description: 'Aproximar e afastar' },
];

/** Traduz uma tecla em comando do editor; nulo = tecla não é atalho. */
export function shortcutCommand(input: KeyInput): EditorCommand | null {
  const key = input.key.toLowerCase();
  const withModifier = input.ctrlKey || input.metaKey;
  if (withModifier && !input.altKey) {
    if (key === 'z') return input.shiftKey ? { type: 'redo' } : { type: 'undo' };
    if (key === 'y') return { type: 'redo' };
    return null;
  }
  if (input.altKey || input.ctrlKey || input.metaKey) return null;
  if (key === 'r') return { type: 'rotate' };
  if (key === 'delete' || key === 'backspace') return { type: 'delete' };
  if (key === 'escape') return { type: 'escape' };
  const tool = (Object.keys(TOOL_KEYS) as Tool[]).find(
    (candidate) => TOOL_KEYS[candidate].toLowerCase() === key,
  );
  return tool ? { type: 'tool', tool } : null;
}

/** Não rouba a tecla de quem está digitando num campo (nome do mapa, busca da biblioteca). */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
