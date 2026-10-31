import { Link } from 'react-router-dom';
import { envResult } from '@/lib/env';

/** Tela inicial. Criar e entrar em salas chega na etapa de implementação. */
export function LobbyPage() {
  return (
    <main className="page page--center">
      <h1>rpgmaps</h1>
      <p>Mesa de RPG online com mapas 3D estilo diorama.</p>
      {!envResult.ok && (
        <div role="alert" className="alert">
          <strong>Ambiente incompleto:</strong>
          <ul>
            {envResult.problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      )}
      <Link className="button" to="/sala/demo">
        Abrir mesa de demonstração
      </Link>
    </main>
  );
}
