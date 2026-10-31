import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="page page--center">
      <h1>Página não encontrada</h1>
      <p>Esse endereço não existe ou a sala foi apagada.</p>
      <Link to="/">Voltar ao início</Link>
    </main>
  );
}
