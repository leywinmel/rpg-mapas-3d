import { useState } from 'react';
import {
  Brush,
  Dices,
  Eye,
  Layers,
  MousePointer2,
  NotebookPen,
  Plus,
  Ruler,
  Swords,
  Trash2,
} from 'lucide-react';
import {
  Avatar,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  notify,
  Panel,
  TextAreaField,
  TextField,
  ThemeToggle,
  Toolbar,
  ToolbarSeparator,
} from '@/components';
import { reportError } from '@/lib/report-error';
import styles from './ShowcasePage.module.css';

/** Vitrine dos componentes base (só no modo de desenvolvimento): /componentes */
export default function ShowcasePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tool, setTool] = useState('select');
  const [saving, setSaving] = useState(false);

  const tools = [
    { id: 'select', label: 'Selecionar', icon: <MousePointer2 size={18} /> },
    { id: 'paint', label: 'Pintar chão', icon: <Brush size={18} /> },
    { id: 'layers', label: 'Camadas', icon: <Layers size={18} /> },
    { id: 'fog', label: 'Névoa', icon: <Eye size={18} /> },
    { id: 'ruler', label: 'Régua', icon: <Ruler size={18} /> },
  ];

  return (
    <main className={styles.showcase}>
      <header className={styles.header}>
        <h1 className="brand">rpgmaps · componentes</h1>
        <ThemeToggle />
      </header>

      <section className={styles.section}>
        <h2>Botões</h2>
        <div className={styles.row}>
          <Button icon={<Plus size={16} />}>Criar mesa</Button>
          <Button variant="secondary">Entrar como convidado</Button>
          <Button variant="ghost">Cancelar</Button>
          <Button variant="danger" icon={<Trash2 size={16} />}>
            Apagar mapa
          </Button>
          <Button
            loading={saving}
            onClick={() => {
              setSaving(true);
              window.setTimeout(() => setSaving(false), 1500);
            }}
          >
            Salvar
          </Button>
          <Button size="sm">Pequeno</Button>
          <Button size="lg">Grande</Button>
          <Button disabled>Desativado</Button>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Ferramentas</h2>
        <Toolbar label="Ferramentas do editor">
          {tools.map((item) => (
            <IconButton
              key={item.id}
              label={item.label}
              icon={item.icon}
              active={tool === item.id}
              onClick={() => setTool(item.id)}
            />
          ))}
          <ToolbarSeparator />
          <IconButton label="Rolar dados" icon={<Dices size={18} />} />
        </Toolbar>
      </section>

      <section className={styles.section}>
        <h2>Campos</h2>
        <div className={styles.grid}>
          <TextField label="Nome da mesa" placeholder="A Cripta do Corvo" hint="Até 80 letras." />
          <TextField label="Apelido" defaultValue="" error="Escolha um apelido para entrar." />
          <TextAreaField label="Anotação" placeholder="Vocês encontram um mapa rasgado…" />
        </div>
      </section>

      <section className={styles.section}>
        <h2>Avisos e janelas</h2>
        <div className={styles.row}>
          <Button
            variant="secondary"
            onClick={() => notify.success('Mapa salvo', 'Taverna do Corvo')}
          >
            Aviso de sucesso
          </Button>
          <Button variant="secondary" onClick={() => notify.info('Ana entrou na mesa')}>
            Aviso informativo
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              reportError(new Error('fetch failed: 503'), {
                userMessage: 'Não conseguimos salvar o mapa.',
                hint: 'Suas mudanças continuam aqui. Tente de novo em instantes.',
                context: { feature: 'showcase' },
              })
            }
          >
            Aviso de erro
          </Button>
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Abrir janela
          </Button>
        </div>
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Apagar este mapa?"
          description="Os jogadores deixam de ver o mapa na hora. Não dá para desfazer."
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={() => setDialogOpen(false)}>
                Apagar
              </Button>
            </>
          }
        />
      </section>

      <section className={styles.section}>
        <h2>Pessoas</h2>
        <div className={styles.row}>
          <Avatar nickname="Mestre Theo" seed="u1" isGameMaster size="lg" />
          <Avatar nickname="Ana Clara" seed="u2" />
          <Avatar nickname="Bia" seed="u3" />
          <Avatar nickname="Caio" seed="u4" size="sm" />
          <Avatar nickname="Duda" seed="u5" />
        </div>
      </section>

      <section className={styles.section}>
        <h2>Painéis e estados</h2>
        <div className={styles.panels}>
          <Panel
            title="Iniciativa"
            icon={<Swords size={16} />}
            actions={<IconButton label="Adicionar" icon={<Plus size={16} />} size="sm" />}
            onClose={() => notify.info('Painel fechado')}
          >
            <LoadingState label="Carregando a ordem…" />
          </Panel>
          <Panel title="Anotações" icon={<NotebookPen size={16} />}>
            <EmptyState
              title="Nenhuma anotação ainda"
              description="O que o mestre mandar para você aparece aqui."
            />
          </Panel>
          <Panel title="Tokens" icon={<Layers size={16} />}>
            <ErrorState
              description="Não conseguimos carregar os tokens."
              onRetry={() => notify.info('Tentando de novo…')}
            />
          </Panel>
        </div>
      </section>
    </main>
  );
}
