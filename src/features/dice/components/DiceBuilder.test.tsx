// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { MAX_DICE_PER_ROLL } from '@/domain';
import { useRollDraft } from '../hooks/useRollDraft';
import { DiceBuilder, type DiceBuilderProps } from './DiceBuilder';

type Overrides = Partial<Omit<DiceBuilderProps, 'draft'>>;

function Harness(overrides: Overrides) {
  const draft = useRollDraft();
  return (
    <DiceBuilder
      draft={draft}
      canHide={false}
      hidden={false}
      onHiddenChange={vi.fn()}
      rolling={false}
      engine="ready"
      onRoll={vi.fn()}
      {...overrides}
    />
  );
}

function setup(overrides: Overrides = {}) {
  render(<Harness {...overrides} />);
  return {
    notation: () => screen.getByLabelText('Rolagem') as HTMLInputElement,
    bonus: () => screen.getByLabelText('Bônus') as HTMLInputElement,
    // Ocupado, o botão ganha "Carregando" no nome: o final "Rolar" é o que não muda.
    roll: () => screen.getByRole('button', { name: /Rolar$/ }),
    add: (name: string) =>
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Adicionar ${name}`) })),
    type: (text: string) =>
      fireEvent.change(screen.getByLabelText('Rolagem'), { target: { value: text } }),
  };
}

describe('DiceBuilder', () => {
  it('shouldAddDiceFromTheButtonsAndShowThemAsChips', () => {
    const ui = setup();
    ui.add('d6');
    ui.add('d6');
    ui.add('d20');

    expect(ui.notation().value).toBe('2d6 + 1d20');
    const chips = screen.getByRole('list', { name: 'Dados escolhidos' });
    expect(chips).toHaveTextContent('2d6');
    expect(chips).toHaveTextContent('1d20');
    expect(screen.getByRole('button', { name: 'Adicionar d6 (2 na rolagem)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar d4' })).toBeInTheDocument();
  });

  it('shouldOfferEveryDieOfTheTable', () => {
    setup();
    const group = screen.getByRole('group', { name: 'Dados' });
    expect(group).toHaveTextContent(/d4.*d6.*d8.*d10.*d12.*d20.*d100/);
  });

  it('shouldTakeOneDieOutOfAChip', () => {
    const ui = setup();
    ui.add('d6');
    ui.add('d6');
    ui.add('d20');
    fireEvent.click(screen.getByRole('button', { name: 'Tirar um dado de 2d6' }));
    expect(ui.notation().value).toBe('1d6 + 1d20');
  });

  it('shouldClearEverythingAndInviteToPickDice', () => {
    const ui = setup();
    expect(screen.getByText('Clique nos dados para montar a rolagem.')).toBeInTheDocument();
    ui.add('d8');
    expect(screen.queryByText('Clique nos dados para montar a rolagem.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar a rolagem' }));
    expect(ui.notation().value).toBe('');
    expect(screen.getByText('Clique nos dados para montar a rolagem.')).toBeInTheDocument();
  });

  describe('bônus', () => {
    it('shouldWriteTheBonusIntoTheNotation', () => {
      const ui = setup();
      ui.add('d20');
      fireEvent.change(ui.bonus(), { target: { value: '5' } });
      expect(ui.notation().value).toBe('1d20 + 5');
      fireEvent.change(ui.bonus(), { target: { value: '-2' } });
      expect(ui.notation().value).toBe('1d20 - 2');
    });

    it('shouldLetThePersonTypeAMinusSignBeforeTheNumber', () => {
      const ui = setup();
      ui.add('d20');
      fireEvent.change(ui.bonus(), { target: { value: '-' } });
      expect(ui.bonus().value).toBe('-');
      expect(ui.notation().value).toBe('1d20');
      fireEvent.change(ui.bonus(), { target: { value: '-4' } });
      expect(ui.notation().value).toBe('1d20 - 4');
    });

    it('shouldShowTheRealBonusAgainWhenLeavingTheField', () => {
      const ui = setup();
      ui.add('d20');
      fireEvent.change(ui.bonus(), { target: { value: '-' } });
      fireEvent.blur(ui.bonus());
      expect(ui.bonus().value).toBe('0');
    });

    it('shouldFollowTheBonusTypedInTheNotation', () => {
      const ui = setup();
      ui.type('1d20+7');
      expect(ui.bonus().value).toBe('7');
    });
  });

  describe('texto digitado', () => {
    it('shouldExplainAnInvalidNotationRightInTheField', () => {
      const ui = setup();
      ui.type('1d7');
      expect(screen.getByRole('alert')).toHaveTextContent('Não existe dado de 7 lados');
      expect(ui.notation()).toHaveAttribute('aria-invalid', 'true');
      expect(ui.roll()).toBeDisabled();
    });

    it('shouldShowTheDiceOfATypedNotationAsChips', () => {
      const ui = setup();
      ui.type('2d20kh1+3');
      expect(screen.getByRole('list', { name: 'Dados escolhidos' })).toHaveTextContent('2d20kh1');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shouldBlockTheNinetyFirstDie', () => {
      const ui = setup();
      ui.type(`${MAX_DICE_PER_ROLL + 1}d6`);
      expect(screen.getByRole('alert')).toHaveTextContent(`No máximo ${MAX_DICE_PER_ROLL} dados`);
      ui.type(`${MAX_DICE_PER_ROLL}d6`);
      expect(screen.getByRole('button', { name: /^Adicionar d6/ })).toBeDisabled();
      expect(screen.getByRole('button', { name: /^Adicionar d20/ })).toBeDisabled();
    });
  });

  describe('rolar', () => {
    it('shouldRollTheStandardNotationOfWhatWasTyped', () => {
      const onRoll = vi.fn();
      const ui = setup({ onRoll });
      ui.type(' 2D20kh1 + 3 ');
      expect(ui.roll()).toBeEnabled();
      fireEvent.click(ui.roll());
      expect(onRoll).toHaveBeenCalledTimes(1);
      expect(onRoll.mock.calls[0]?.[0]).toMatchObject({ notation: '2d20kh1 + 3', modifier: 3 });
    });

    it('shouldRollWithTheEnterKeyInTheField', () => {
      const onRoll = vi.fn();
      const ui = setup({ onRoll });
      ui.add('d6');
      fireEvent.submit(ui.notation().form as HTMLFormElement);
      expect(onRoll).toHaveBeenCalledTimes(1);
    });

    it('shouldNotRollWithoutDice', () => {
      const onRoll = vi.fn();
      const ui = setup({ onRoll });
      expect(ui.roll()).toBeDisabled();
      fireEvent.submit(ui.notation().form as HTMLFormElement);
      ui.type('+ 3');
      fireEvent.submit(ui.notation().form as HTMLFormElement);
      expect(onRoll).not.toHaveBeenCalled();
    });

    it('shouldWaitWhileTheRollIsBeingSaved', () => {
      const onRoll = vi.fn();
      const ui = setup({ onRoll, rolling: true });
      ui.add('d6');
      expect(ui.roll()).toBeDisabled();
      expect(ui.roll()).toHaveAttribute('aria-busy', 'true');
      fireEvent.submit(ui.notation().form as HTMLFormElement);
      expect(onRoll).not.toHaveBeenCalled();
    });
  });

  describe('motor de física', () => {
    it('shouldHoldTheButtonWhileTheEngineLoads', () => {
      const onRoll = vi.fn();
      const ui = setup({ onRoll, engine: 'loading' });
      ui.add('d6');
      expect(ui.roll()).toHaveAttribute('aria-busy', 'true');
      fireEvent.submit(ui.notation().form as HTMLFormElement);
      expect(onRoll).not.toHaveBeenCalled();
    });

    it('shouldDisableTheButtonWithoutSpinningWhenTheEngineFailed', () => {
      const ui = setup({ engine: 'error' });
      ui.add('d6');
      expect(ui.roll()).toBeDisabled();
      expect(ui.roll()).not.toHaveAttribute('aria-busy');
    });
  });

  describe('rolar escondido', () => {
    it('shouldOfferTheSwitchOnlyToTheGameMaster', () => {
      setup({ canHide: false });
      expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    });

    it('shouldReportWhenTheMasterTurnsItOn', () => {
      const onHiddenChange = vi.fn();
      setup({ canHide: true, onHiddenChange });
      const toggle = screen.getByRole('switch', { name: /rolar escondido/i });
      expect(toggle).not.toBeChecked();
      fireEvent.click(toggle);
      expect(onHiddenChange).toHaveBeenCalledWith(true);
    });

    it('shouldShowTheSwitchAsOnWhenHidden', () => {
      setup({ canHide: true, hidden: true });
      expect(screen.getByRole('switch', { name: /rolar escondido/i })).toBeChecked();
    });
  });
});
