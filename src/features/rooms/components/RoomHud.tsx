import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, DoorOpen, Link2, Pencil, Trash2, Users } from 'lucide-react';
import { IconButton, notify, ThemeToggle, Toolbar, ToolbarSeparator } from '@/components';
import { absoluteAppUrl } from '@/features/auth';
import { NotesButton, NotesPanel, NotesProvider } from '@/features/notes';
import { QualityButton } from '@/features/scene';
import { reportError } from '@/lib/report-error';
import { useRoomSession } from '../hooks/room-session-context';
import { LOBBY_PATH, roomPath } from '../paths';
import { PresencePanel } from './PresencePanel';
import { DeleteRoomDialog, LeaveRoomDialog, RenameRoomDialog } from './RoomAdminDialogs';
import styles from './rooms.module.css';

type OpenDialog = 'rename' | 'delete' | 'leave' | null;

/** O canto superior direito abre um painel por vez: quem está na mesa ou as anotações. */
type SidePanel = 'presence' | 'notes' | null;

async function copyInviteLink(slug: string): Promise<void> {
  const link = absoluteAppUrl(roomPath(slug));
  try {
    await navigator.clipboard.writeText(link);
    notify.success('Link de convite copiado.', 'Mande para os jogadores entrarem na mesa.');
  } catch (error) {
    // Alguns navegadores bloqueiam a área de transferência; o link continua na barra de endereço.
    reportError(error, {
      userMessage: 'Não deu para copiar o link.',
      hint: `Copie o endereço da barra do navegador: ${link}`,
      context: { feature: 'rooms', action: 'copy-invite' },
      severity: 'warn',
    });
  }
}

/** Barra da sala sobre a cena: nome, convite, quem está na mesa, as anotações e o menu do papel. */
export function RoomHud() {
  const { room, isGameMaster } = useRoomSession();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [sidePanel, setSidePanel] = useState<SidePanel>('presence');
  const closeDialog = () => setDialog(null);
  const closeSidePanel = () => setSidePanel(null);
  const toggleSidePanel = (panel: Exclude<SidePanel, null>) =>
    setSidePanel((current) => (current === panel ? null : panel));

  return (
    // O provider fica montado com o painel fechado: o aviso de anotação nova chega do mesmo jeito.
    <NotesProvider panelOpen={sidePanel === 'notes'}>
      <div className="room__hud">
        <Toolbar label="Mesa" className={styles.hudGroup}>
          <IconButton
            label="Voltar ao início"
            icon={<ArrowLeft size={18} />}
            onClick={() => navigate(LOBBY_PATH)}
          />
          <h1 className={styles.roomTitle} title={room.name}>
            {room.name}
          </h1>
          <IconButton
            label="Copiar link de convite"
            icon={<Link2 size={18} />}
            onClick={() => void copyInviteLink(room.slug)}
          />
        </Toolbar>
        <Toolbar label={isGameMaster ? 'Menu do mestre' : 'Menu do jogador'}>
          <IconButton
            label={
              sidePanel === 'presence' ? 'Esconder quem está na mesa' : 'Mostrar quem está na mesa'
            }
            icon={<Users size={18} />}
            active={sidePanel === 'presence'}
            onClick={() => toggleSidePanel('presence')}
          />
          <NotesButton active={sidePanel === 'notes'} onClick={() => toggleSidePanel('notes')} />
          <ToolbarSeparator />
          {isGameMaster ? (
            <>
              <IconButton
                label="Renomear mesa"
                icon={<Pencil size={18} />}
                onClick={() => setDialog('rename')}
              />
              <IconButton
                label="Apagar mesa"
                icon={<Trash2 size={18} />}
                onClick={() => setDialog('delete')}
              />
            </>
          ) : (
            <IconButton
              label="Sair da mesa"
              icon={<DoorOpen size={18} />}
              onClick={() => setDialog('leave')}
            />
          )}
          <ToolbarSeparator />
          <QualityButton />
          <ThemeToggle />
        </Toolbar>
      </div>
      {sidePanel === 'presence' && (
        <div className={styles.sidePanel}>
          <PresencePanel onClose={closeSidePanel} />
        </div>
      )}
      {sidePanel === 'notes' && (
        <div className={styles.sidePanel}>
          <NotesPanel onClose={closeSidePanel} />
        </div>
      )}
      {isGameMaster ? (
        <>
          <RenameRoomDialog open={dialog === 'rename'} onClose={closeDialog} />
          <DeleteRoomDialog open={dialog === 'delete'} onClose={closeDialog} />
        </>
      ) : (
        <LeaveRoomDialog open={dialog === 'leave'} onClose={closeDialog} />
      )}
    </NotesProvider>
  );
}
