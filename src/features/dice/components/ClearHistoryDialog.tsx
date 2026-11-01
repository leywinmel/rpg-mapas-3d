import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Dialog } from '@/components';
import { FormNotice } from '@/features/auth';
import { reportDiceFailure } from '../services/dice-errors';

export type ClearHistoryDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Apaga o histórico; lança erro se o banco recusar. */
  onConfirm: () => Promise<void>;
};

/** Confirmação antes de apagar o histórico de todos. O erro aparece na própria janela. */
export function ClearHistoryDialog({ open, onClose, onConfirm }: ClearHistoryDialogProps) {
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  function handleClose() {
    setFailure(null);
    onClose();
  }

  async function handleConfirm() {
    setFailure(null);
    setPending(true);
    try {
      await onConfirm();
      handleClose();
    } catch (error) {
      setFailure(reportDiceFailure(error, { action: 'clear-history', toast: false }));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Limpar o histórico de rolagens?"
      description="As rolagens somem para todos na mesa, inclusive as escondidas. Não dá para desfazer."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={pending}
            icon={<Trash2 size={16} />}
            onClick={handleConfirm}
          >
            Limpar histórico
          </Button>
        </>
      }
    >
      {failure && <FormNotice tone="error">{failure}</FormNotice>}
    </Dialog>
  );
}
