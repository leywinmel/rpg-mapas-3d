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
  | { type: 'level'; delta: number }
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

/** Shift + Page Up/Down sobe ou desce o objeto selecionado (sem Shift, é o corte de andares). */
const LEVEL_KEYS: Readonly<Record<string, number>> = { pageup: 1, pagedown: -1 };

export type ShortcutHelp = { keys: string; description: string };

export const SHORTCUT_HELP: readonly ShortcutHelp[] = [
  ...(Object.keys(TOOL_KEYS) as Tool[]).map((tool) => ({
    keys: TOOL_KEYS[tool],
    description: TOOL_LABELS[tool],
  })),
  { keys: 'R', description: 'Girar a peça (ou o objeto selecionado)' },
  { keys: 'Delete', description: 'Apagar o objeto selecionado' },
  { keys: 'Shift+Page Up / Shift+Page Down', description: 'Subir ou descer o objeto selecionado' },
  { keys: 'Ctrl+Z', description: 'Desfazer' },
  { keys: 'Ctrl+Shift+Z ou Ctrl+Y', description: 'Refazer' },
  { keys: 'Esc', description: 'Voltar para Selecionar' },
  { keys: 'Page Up / Page Down', description: 'Mostrar ou esconder um andar (corte)' },
  { keys: 'Home', description: 'Mostrar todos os andares' },
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
  const level = input.shiftKey ? LEVEL_KEYS[key] : undefined;
  if (level !== undefined) return { type: 'level', delta: level };
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

/** Tecla dentro de um diálogo aberto (ex: renomear mapa) não é atalho do editor. */
export function isInsideDialog(target: EventTarget | null): boolean {
  return (
    typeof Element !== 'undefined' && target instanceof Element && target.closest('dialog') !== null
  );
}

/** Atalho que vale para o teclado da cena: nem campo de texto, nem diálogo aberto. */
export function isSceneKey(event: KeyboardEvent): boolean {
  return !isTypingTarget(event.target) && !isInsideDialog(event.target);
}
