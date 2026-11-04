import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Button, Dialog } from '@/components';
import { FormNotice } from '@/features/auth';
import { useInitiativeStore } from '../hooks/initiative-store';
import { initiativeFailures } from '../services/initiative-errors';

/** Confirmação antes de limpar a ordem de todos. O erro aparece na própria janela. */
export function EndCombatDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  function handleClose() {
    setFailure(null);
    onClose();
  }

  async function handleConfirm() {
    const clear = useInitiativeStore.getState().actions?.clear;
    if (!clear) return;
    setFailure(null);
    setPending(true);
    try {
      await clear();
      handleClose();
    } catch (error) {
      setFailure(initiativeFailures.report(error, { action: 'clear', toast: false }));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Encerrar o combate?"
      description="A ordem de iniciativa fica vazia para todos e a rodada volta a zero."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={pending}
            icon={<Flag size={16} />}
            onClick={handleConfirm}
          >
            Encerrar combate
          </Button>
        </>
      }
    >
      {failure && <FormNotice tone="error">{failure}</FormNotice>}
    </Dialog>
  );
}
