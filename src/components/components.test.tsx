// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Avatar } from './Avatar/Avatar';
import { avatarColorIndex, initialsOf } from './Avatar/avatar-utils';
import { Button } from './Button/Button';
import { ErrorBoundary } from './ErrorBoundary';
import { IconButton } from './IconButton/IconButton';
import { TextField } from './TextField/TextField';
import { useToastStore } from './toast/toast-store';
import { ToastViewport } from './toast/ToastViewport';
import { setLogSink, type LogEntry } from '@/lib/logger';
import { reportError } from '@/lib/report-error';

function captureLogs(): LogEntry[] {
  const entries: LogEntry[] = [];
  setLogSink((entry) => entries.push(entry));
  return entries;
}

afterEach(() => {
  useToastStore.setState({ toasts: [] });
});

describe('Button', () => {
  it('shouldBlockClicksWhileLoading', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Salvar
      </Button>,
    );
    const button = screen.getByRole('button', { name: /salvar/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('IconButton', () => {
  it('shouldExposeItsLabelAndPressedState', () => {
    render(<IconButton label="Névoa" icon={<span>N</span>} active />);
    expect(screen.getByRole('button', { name: 'Névoa' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('TextField', () => {
  it('shouldLinkTheErrorMessageToTheInput', () => {
    render(<TextField label="Apelido" error="Escolha um apelido." />);
    const input = screen.getByLabelText('Apelido');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Escolha um apelido.');
  });
});

describe('Avatar', () => {
  it('shouldShowInitialsAndMarkTheGameMaster', () => {
    expect(initialsOf('Ana Clara Souza')).toBe('AS');
    expect(initialsOf('  bia ')).toBe('B');
    expect(initialsOf('')).toBe('?');
    render(<Avatar nickname="Theo" isGameMaster />);
    expect(screen.getByRole('img', { name: 'Theo (mestre)' })).toBeInTheDocument();
  });

  it('shouldPickAStableColorPerPerson', () => {
    expect(avatarColorIndex('user-1')).toBe(avatarColorIndex('user-1'));
    expect(avatarColorIndex('user-1')).toBeGreaterThanOrEqual(1);
    expect(avatarColorIndex('user-1')).toBeLessThanOrEqual(8);
  });

  it('shouldRenderNicknamesAsTextNotHtml', () => {
    render(<Avatar nickname="<img src=x onerror=alert(1)>" />);
    expect(document.querySelector('img')).toBeNull();
  });
});

describe('reportError', () => {
  it('shouldLogTheDetailAndShowOnlyAFriendlyMessage', () => {
    const logs = captureLogs();
    render(<ToastViewport />);
    act(() => {
      reportError(new Error('connect ECONNREFUSED ana@exemplo.com'), {
        userMessage: 'Não conseguimos salvar o mapa.',
        context: { feature: 'map-editor' },
      });
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Não conseguimos salvar o mapa.');
    expect(screen.queryByText(/ECONNREFUSED/)).toBeNull();
    expect(logs[0]?.level).toBe('error');
    expect(logs[0]?.error?.message).toBe('connect ECONNREFUSED [email]');
  });

  it('shouldUseWarningForRecoverableProblems', () => {
    const logs = captureLogs();
    reportError(new Error('lento'), { userMessage: 'Conexão instável.', severity: 'warn' });
    expect(logs[0]?.level).toBe('warn');
    expect(useToastStore.getState().toasts[0]?.tone).toBe('warning');
  });
});

describe('ErrorBoundary', () => {
  it('shouldReplaceACrashWithAFriendlyMessage', () => {
    const logs = captureLogs();
    const silence = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    function Broken(): never {
      throw new Error('three.js explodiu');
    }
    render(
      <ErrorBoundary area="a cena 3D">
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Não deu para mostrar a cena 3D');
    expect(screen.queryByText(/explodiu/)).toBeNull();
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeInTheDocument();
    expect(logs.some((entry) => entry.level === 'error')).toBe(true);
    silence.mockRestore();
  });
});
