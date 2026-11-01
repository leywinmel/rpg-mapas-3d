import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '@/lib/logger';
import { ErrorState } from './States/States';

export type ErrorBoundaryProps = {
  children: ReactNode;
  /** Onde está (ex: "cena 3D"), para o log e para a mensagem. */
  area: string;
  fill?: boolean;
};

type State = { failed: boolean };

/**
 * Rede de segurança: se uma parte da tela quebrar, ela vira um aviso com
 * "Tentar de novo" em vez de derrubar o site inteiro ou mostrar stack trace.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    logger.error(
      `Falha ao exibir: ${this.props.area}`,
      { componentStack: info.componentStack },
      error,
    );
  }

  private retry = () => this.setState({ failed: false });

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <ErrorState
        fill={this.props.fill}
        title={`Não deu para mostrar ${this.props.area}`}
        description="Isso não deveria acontecer. Tente de novo; se continuar, recarregue a página."
        onRetry={this.retry}
      />
    );
  }
}
