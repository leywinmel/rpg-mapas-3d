import { ArrowLeft, ExternalLink } from 'lucide-react';
import { ButtonLink } from '@/components';
import { LOBBY_PATH } from '@/features/rooms/paths';
import { FONT_CREDITS, MODEL_CREDITS, type Credit } from '../credits';
import styles from './CreditsPage.module.css';

function ExternalAnchor({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={styles.link}>
      {children}
      <ExternalLink size={12} aria-hidden="true" />
      <span className="visually-hidden"> (abre em outra aba)</span>
    </a>
  );
}

function CreditList({ title, credits }: { title: string; credits: readonly Credit[] }) {
  return (
    <section className={styles.section} aria-label={title}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <ul className={styles.list}>
        {credits.map((credit) => (
          <li key={credit.work} className={styles.item}>
            <div className={styles.itemHeader}>
              <ExternalAnchor href={credit.url}>{credit.work}</ExternalAnchor>
              <span className={styles.author}>por {credit.author}</span>
            </div>
            <p className={styles.usage}>{credit.usage}</p>
            <p className={styles.license}>
              Licença: <ExternalAnchor href={credit.licenseUrl}>{credit.license}</ExternalAnchor>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Créditos públicos dos materiais de terceiros (modelos 3D e fontes). */
export default function CreditsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <ButtonLink to={LOBBY_PATH} variant="ghost" size="sm" icon={<ArrowLeft size={16} />}>
          Voltar ao início
        </ButtonLink>
        <header className={styles.header}>
          <h1 className={styles.title}>Créditos</h1>
          <p className={styles.intro}>
            Os mapas da mesa usam modelos 3D gratuitos de artistas que liberam o trabalho para
            qualquer uso. Eles não exigem crédito, mas merecem: obrigado!
          </p>
        </header>
        <CreditList title="Modelos 3D" credits={MODEL_CREDITS} />
        <CreditList title="Fontes" credits={FONT_CREDITS} />
      </div>
    </main>
  );
}
