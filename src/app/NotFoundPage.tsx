import { Compass } from 'lucide-react';
import { ButtonLink, EmptyState } from '@/components';

export function NotFoundPage() {
  return (
    <main className="page page--center">
      <EmptyState
        icon={<Compass size={22} />}
        title="Página não encontrada"
        description="Esse endereço não existe ou a mesa foi apagada."
        action={<ButtonLink to="/">Voltar ao início</ButtonLink>}
      />
    </main>
  );
}
