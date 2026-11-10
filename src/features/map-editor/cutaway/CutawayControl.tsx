import { useEffect, useState } from 'react';
import { Building2, ChevronDown, ChevronUp, Eye, Layers, Users } from 'lucide-react';
import { IconButton, Toolbar, ToolbarSeparator } from '@/components';
import { NO_CUTAWAY, stepCutaway, type Cutaway, type CutawayDirection } from '@/domain/map-v2';
import { reportError } from '@/lib/report-error';
import { isSceneKey } from '../editor/shortcuts';
import { cutawayPhrase, shortCutawayLabel } from './cutaway-labels';
import { masterCutaway, type CutawayBinding } from './cutaway-binding';
import styles from './CutawayControl.module.css';

const ICON_SIZE = 18;
const BADGE_ICON_SIZE = 14;

/** Teclas do corte: Page Up mostra um andar, Page Down esconde, Home mostra todos. */
/** Com Shift, Page Up/Down mexe no objeto selecionado do editor, não no corte. */
function hasModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey || event.altKey || event.shiftKey;
}

const CUTAWAY_KEYS: Readonly<Record<string, CutawayDirection | 'all'>> = {
  PageUp: 'up',
  PageDown: 'down',
  Home: 'all',
};

export type CutawayControlProps = {
  binding: CutawayBinding;
  /** Andar mais alto do mapa (topStory): até onde o controle vai. */
  top: number;
};

type StoryBadgeProps = { icon: typeof Layers; label: string; text: string };

/** Nome curto do andar com a frase inteira para a dica e o leitor de tela. */
function StoryBadge({ icon: Icon, label, text }: StoryBadgeProps) {
  return (
    <span className={styles.badge} aria-live="polite" title={text}>
      <Icon size={BADGE_ICON_SIZE} aria-hidden="true" />
      <span aria-hidden="true">{label}</span>
      <span className="visually-hidden">{text}</span>
    </span>
  );
}

/**
 * Andar que os jogadores veem: o mestre manda à mesa o andar que ele está olhando, ou volta a
 * mostrar todos. A escolha fica na sala (rooms.cutaway_lock) e chega aos jogadores na hora.
 */
type TableStoryControlProps = {
  binding: CutawayBinding;
  setTableCutaway: NonNullable<CutawayBinding['setTableCutaway']>;
};

function TableStoryControl({ binding, setTableCutaway }: TableStoryControlProps) {
  const [pending, setPending] = useState(false);
  const { own, tableCutaway } = binding;

  const choose = async (cut: Cutaway) => {
    setPending(true);
    try {
      await setTableCutaway(cut);
    } catch (error) {
      reportError(error, {
        userMessage: 'Não deu para mudar o andar que os jogadores veem.',
        context: { feature: 'map-editor', action: 'cutaway-table-story' },
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <StoryBadge
        icon={Users}
        label={shortCutawayLabel(tableCutaway)}
        text={`Os jogadores veem ${cutawayPhrase(tableCutaway)}`}
      />
      <IconButton
        label={`Mostrar aos jogadores o andar que você vê (${cutawayPhrase(own)})`}
        icon={<Eye size={ICON_SIZE} />}
        size="sm"
        disabled={pending || tableCutaway === own}
        onClick={() => void choose(own)}
      />
      <IconButton
        label="Mostrar todos os andares aos jogadores"
        icon={<Building2 size={ICON_SIZE} />}
        size="sm"
        disabled={pending || tableCutaway === NO_CUTAWAY}
        onClick={() => void choose(NO_CUTAWAY)}
      />
    </>
  );
}

/**
 * Controle discreto do corte de andares, na borda direita da cena, só para o mestre (RPG-30).
 * Em cima, o andar que ele mesmo vê: sobe e desce um andar por vez (também por Page Up, Page
 * Down e Home). Embaixo, o andar que os jogadores veem, que só muda quando ele manda.
 */
export function CutawayControl({ binding, top }: CutawayControlProps) {
  const visible = masterCutaway(binding);
  const up = stepCutaway(visible, 'up', top);
  const down = stepCutaway(visible, 'down', top);
  const canGoUp = up !== visible;
  const canGoDown = down !== visible;
  const { setOwn, setTableCutaway } = binding;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const command = CUTAWAY_KEYS[event.key];
      if (!command || hasModifier(event) || !isSceneKey(event)) return;
      event.preventDefault();
      if (command === 'all') setOwn(NO_CUTAWAY);
      else if (command === 'up' && canGoUp) setOwn(up);
      else if (command === 'down' && canGoDown) setOwn(down);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setOwn, up, down, canGoUp, canGoDown]);

  return (
    <div>
      <Toolbar label="Corte de andares" orientation="vertical">
        <IconButton
          label="Mostrar o andar de cima (Page Up)"
          icon={<ChevronUp size={ICON_SIZE} />}
          size="sm"
          disabled={!canGoUp}
          onClick={() => setOwn(up)}
        />
        <StoryBadge
          icon={Layers}
          label={shortCutawayLabel(visible)}
          text={`Você vê ${cutawayPhrase(visible)}`}
        />
        <IconButton
          label="Esconder o andar de cima (Page Down)"
          icon={<ChevronDown size={ICON_SIZE} />}
          size="sm"
          disabled={!canGoDown}
          onClick={() => setOwn(down)}
        />
        {setTableCutaway && (
          <>
            <ToolbarSeparator />
            <TableStoryControl binding={binding} setTableCutaway={setTableCutaway} />
          </>
        )}
      </Toolbar>
    </div>
  );
}
