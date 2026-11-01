import { useMemo, useRef, useState, type ChangeEvent, type Dispatch } from 'react';
import { Trash, Upload } from 'lucide-react';
import { Button, Dialog, ErrorState, IconButton, Spinner } from '@/components';
import { normalizeSearchText } from '@/features/scene';
import type { Brush, EditorAction, Tool } from '../editor/editor-reducer';
import { useModelUrls } from '../hooks/useModelUrls';
import { useMyAssets } from '../hooks/useMyAssets';
import type { MapAsset } from '../types';
import { GLB_EXTENSION, MAX_GLB_BYTES } from '../upload/glb-validation';
import { PieceThumbnail } from './PieceThumbnail';
import styles from './SidePanel.module.css';

const BYTES_PER_MB = 1024 * 1024;
const MAX_MB = MAX_GLB_BYTES / BYTES_PER_MB;

type Props = { query: string; brush: Brush; tool: Tool; dispatch: Dispatch<EditorAction> };

type DeleteDialogProps = {
  asset: MapAsset | null;
  onCancel: () => void;
  onConfirm: (asset: MapAsset) => Promise<boolean>;
};

function DeleteModelDialog({ asset, onCancel, onConfirm }: DeleteDialogProps) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const close = () => {
    setFailed(false);
    onCancel();
  };
  const confirm = async () => {
    if (!asset) return;
    setBusy(true);
    setFailed(false);
    const removed = await onConfirm(asset);
    setBusy(false);
    if (removed) close();
    else setFailed(true);
  };
  return (
    <Dialog
      open={asset !== null}
      onClose={close}
      title="Apagar modelo?"
      description={asset ? `“${asset.name}” sai de “Meus modelos”.` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="danger" loading={busy} onClick={() => void confirm()}>
            Apagar
          </Button>
        </>
      }
    >
      <p className={styles.muted}>
        Objetos que já usam este modelo nos mapas viram caixas marcadas até serem trocados.
      </p>
      {failed && (
        <p className={styles.error} role="alert">
          Não conseguimos apagar o modelo. Tente de novo em instantes.
        </p>
      )}
    </Dialog>
  );
}

type Message = { tone: 'error' | 'success'; text: string };

/** "Meus modelos": .glb enviados pelo mestre, com envio validado no navegador. */
export function MyModelsSection({ query, brush, tool, dispatch }: Props) {
  const models = useMyAssets();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [toDelete, setToDelete] = useState<MapAsset | null>(null);
  const ids = useMemo(() => models.assets.map((asset) => asset.id), [models.assets]);
  const urls = useModelUrls(ids);
  const needle = normalizeSearchText(query);
  const visible = models.assets.filter((asset) => normalizeSearchText(asset.name).includes(needle));

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Limpa o campo para o mesmo arquivo poder ser escolhido de novo depois de um erro.
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setMessage(null);
    const result = await models.upload(file);
    setUploading(false);
    if (!result.ok) {
      setMessage({ tone: 'error', text: result.message });
      return;
    }
    setMessage({ tone: 'success', text: `“${result.asset.name}” está pronto para usar.` });
    dispatch({ type: 'choose-prop', asset: { source: 'upload', assetId: result.asset.id } });
  };

  const isChosen = (asset: MapAsset) =>
    tool === 'prop' && brush.prop.source === 'upload' && brush.prop.assetId === asset.id;

  return (
    <section aria-label="Meus modelos">
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Meus modelos</h3>
        <Button
          variant="secondary"
          size="sm"
          icon={<Upload size={14} />}
          loading={uploading}
          onClick={() => input.current?.click()}
        >
          Enviar .glb
        </Button>
        <input
          ref={input}
          type="file"
          accept={`${GLB_EXTENSION},model/gltf-binary`}
          className={styles.hiddenInput}
          aria-label="Arquivo .glb"
          onChange={(event) => void onFile(event)}
        />
      </div>
      <p className={styles.muted}>
        Modelo 3D .glb de até {MAX_MB} MB. Ele é ajustado ao tamanho de uma casa.
      </p>
      {message && (
        <p
          className={message.tone === 'error' ? styles.error : styles.success}
          role={message.tone === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      )}
      {models.status === 'loading' && <Spinner size="sm" label="Carregando seus modelos" />}
      {models.status === 'error' && (
        <ErrorState title="Seus modelos não carregaram" onRetry={models.retry} />
      )}
      {models.status === 'ready' && models.assets.length === 0 && (
        <p className={styles.muted}>Nenhum modelo enviado ainda.</p>
      )}
      {visible.length > 0 && (
        <ul className={styles.grid}>
          {visible.map((asset) => (
            <li key={asset.id} className={styles.modelItem}>
              <button
                type="button"
                className={styles.piece}
                aria-pressed={isChosen(asset)}
                title={asset.name}
                onClick={() =>
                  dispatch({ type: 'choose-prop', asset: { source: 'upload', assetId: asset.id } })
                }
              >
                <PieceThumbnail source={{ type: 'model', url: urls[asset.id] ?? null }} />
                <span className={styles.pieceLabel}>{asset.name}</span>
              </button>
              <IconButton
                label={`Apagar ${asset.name}`}
                icon={<Trash size={14} />}
                size="sm"
                className={styles.modelDelete}
                onClick={() => setToDelete(asset)}
              />
            </li>
          ))}
        </ul>
      )}
      <DeleteModelDialog
        asset={toDelete}
        onCancel={() => setToDelete(null)}
        onConfirm={models.remove}
      />
    </section>
  );
}
