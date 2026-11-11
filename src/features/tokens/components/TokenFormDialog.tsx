import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { ImagePlus, Plus } from 'lucide-react';
import { Button, Dialog, notify, SegmentedControl, TextField } from '@/components';
import { MAX_TOKEN_NAME_LENGTH, MAX_TOKEN_SIZE, MIN_TOKEN_SIZE } from '@/domain';
import { useRoomSession } from '@/features/rooms';
import { validateForm, type FieldErrors } from '@/lib/validation';
import {
  DEFAULT_TOKEN_COLORS,
  TOKEN_IMAGE_MAX_MEGABYTES,
  TOKEN_IMAGE_MIME_TYPES,
  TOKEN_MODEL_GROUPS,
  TOKEN_MODELS,
  tokenModelEntry,
  type TokenKind,
  type TokenModelKey,
} from '../constants';
import { useTokenActions } from '../hooks/tokens-store';
import { checkTokenImage, tokenColorSchema, tokenFormSchema } from '../schemas';
import { tokenFailures } from '../services/token-errors';
import type { TokenLook } from '../types';
import styles from './tokens.module.css';
import { UploadedModelField } from './UploadedModelField';

const KIND_OPTIONS = [
  { value: 'model', label: 'Boneco 3D' },
  { value: 'image', label: 'Imagem' },
  { value: 'asset', label: 'Modelo enviado' },
] as const satisfies ReadonlyArray<{ value: TokenKind; label: string }>;

const SIZE_OPTIONS = Array.from(
  { length: MAX_TOKEN_SIZE - MIN_TOKEN_SIZE + 1 },
  (_, index) => MIN_TOKEN_SIZE + index,
);

const ACCEPT = TOKEN_IMAGE_MIME_TYPES.join(',');
/** Valor do seletor de dono para "nenhum jogador" (token do mestre). */
const NO_OWNER = '';

type FormFields = { name: string; size: number; hpMax: number | null; ownerId: string | null };

function useFilePreview(file: File | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return url;
}

export type TokenFormDialogProps = { open: boolean; onClose: () => void };

/**
 * Janela do mestre para criar um token: imagem em pé numa base ou boneco com cores, tamanho em
 * casas, vida e dono. O token aparece no centro da câmera. O erro fica na própria janela.
 */
export function TokenFormDialog({ open, onClose }: TokenFormDialogProps) {
  const { members } = useRoomSession();
  const actions = useTokenActions();
  const formId = useId();
  const nameId = useId();
  const sizeId = useId();
  const ownerId = useId();
  const modelId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<TokenKind>('model');
  const [image, setImage] = useState<File | null>(null);
  const [modelKey, setModelKey] = useState<TokenModelKey>('figure');
  const [primary, setPrimary] = useState<string>(DEFAULT_TOKEN_COLORS.primary);
  const [secondary, setSecondary] = useState<string>(DEFAULT_TOKEN_COLORS.secondary);
  const [size, setSize] = useState(MIN_TOKEN_SIZE);
  const [hpMax, setHpMax] = useState('');
  const [owner, setOwner] = useState(NO_OWNER);
  const [hidden, setHidden] = useState(false);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<FormFields & { image: string; asset: string }>>(
    {},
  );
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const preview = useFilePreview(image);
  const players = members.filter((member) => member.role === 'player');

  useEffect(() => {
    if (open) document.getElementById(nameId)?.focus();
  }, [open, nameId]);

  function handleClose() {
    if (!pending && !uploading) onClose();
  }

  function handlePick(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (!picked) return;
    const problem = checkTokenImage(picked);
    setErrors((current) => ({ ...current, image: problem ?? undefined }));
    if (!problem) setImage(picked);
  }

  function buildLook(): TokenLook | null {
    if (kind === 'image') {
      if (image) return { kind: 'image', image };
      setErrors((current) => ({ ...current, image: 'Escolha a imagem do token.' }));
      return null;
    }
    if (kind === 'asset') {
      if (assetId) return { kind: 'asset', assetId };
      setErrors((current) => ({ ...current, asset: 'Escolha ou envie o modelo do token.' }));
      return null;
    }
    const colors = [primary, secondary].map((color) => tokenColorSchema.safeParse(color));
    if (colors.some((color) => !color.success)) {
      setFailure('Escolha cores válidas para o boneco.');
      return null;
    }
    return { kind: 'model', modelKey, colorPrimary: primary, colorSecondary: secondary };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || uploading || !actions) return;
    setFailure(null);
    const result = validateForm(tokenFormSchema, {
      name,
      size,
      hpMax: hpMax.trim() === '' ? null : Number(hpMax),
      ownerId: owner === NO_OWNER ? null : owner,
      hidden,
    });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    const look = buildLook();
    if (!look) return;
    setPending(true);
    try {
      await actions.createToken({ ...result.data, look });
    } catch (error) {
      setFailure(tokenFailures.report(error, { action: 'create' }));
      return;
    } finally {
      setPending(false);
    }
    notify.success('Token criado.', 'Ele apareceu no centro da câmera. Arraste para o lugar.');
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Novo token"
      description="Personagem, monstro ou NPC. Ele aparece no centro da câmera."
      footer={
        <>
          <Button variant="ghost" disabled={pending || uploading} onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={pending}
            disabled={uploading}
            icon={<Plus size={16} />}
          >
            Criar token
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          id={nameId}
          label="Nome"
          value={name}
          maxLength={MAX_TOKEN_NAME_LENGTH}
          autoComplete="off"
          placeholder="Ex.: Goblin arqueiro"
          error={errors.name}
          disabled={pending}
          onChange={(event) => setName(event.target.value)}
        />
        <SegmentedControl
          label="Aparência"
          options={KIND_OPTIONS}
          value={kind}
          onChange={setKind}
        />
        {kind === 'asset' && (
          <UploadedModelField
            value={assetId}
            onChange={(picked) => {
              setAssetId(picked);
              if (picked) setErrors((current) => ({ ...current, asset: undefined }));
            }}
            error={errors.asset}
            disabled={pending}
            onBusyChange={setUploading}
          />
        )}
        {kind === 'image' && (
          <div className={styles.field}>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              hidden
              aria-label="Imagem do token"
              onChange={handlePick}
            />
            <div className={styles.imageRow}>
              {preview && <img className={styles.preview} src={preview} alt="Prévia da imagem" />}
              <Button
                variant="secondary"
                icon={<ImagePlus size={16} />}
                disabled={pending}
                onClick={() => fileRef.current?.click()}
              >
                {image ? 'Trocar imagem' : 'Escolher imagem'}
              </Button>
            </div>
            <span className={styles.hint}>
              PNG, JPEG ou WebP, até {TOKEN_IMAGE_MAX_MEGABYTES} MB. Fica em pé numa base, como
              papel-cartão.
            </span>
            {errors.image && (
              <p role="alert" className={styles.error}>
                {errors.image}
              </p>
            )}
          </div>
        )}
        {kind === 'model' && (
          <>
            <div className={styles.field}>
              <label htmlFor={modelId} className={styles.label}>
                Boneco
              </label>
              <select
                id={modelId}
                className={styles.select}
                value={modelKey}
                disabled={pending}
                onChange={(event) => setModelKey(event.target.value as TokenModelKey)}
              >
                {TOKEN_MODEL_GROUPS.map((group) => (
                  <optgroup key={group.value} label={group.label}>
                    {TOKEN_MODELS.filter((model) => model.group === group.value).map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {tokenModelEntry(modelKey).file && (
                <span className={styles.hint}>
                  Boneco pronto, com as cores dele. As cores abaixo valem só para os simples.
                </span>
              )}
            </div>
            <div className={styles.colorRow} hidden={tokenModelEntry(modelKey).file !== null}>
              <label className={styles.check}>
                <input
                  type="color"
                  className={styles.color}
                  value={primary}
                  disabled={pending}
                  onChange={(event) => setPrimary(event.target.value)}
                />
                Cor principal
              </label>
              <label className={styles.check}>
                <input
                  type="color"
                  className={styles.color}
                  value={secondary}
                  disabled={pending}
                  onChange={(event) => setSecondary(event.target.value)}
                />
                Detalhe
              </label>
            </div>
          </>
        )}
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label htmlFor={sizeId} className={styles.label}>
              Tamanho
            </label>
            <select
              id={sizeId}
              className={styles.select}
              value={size}
              disabled={pending}
              onChange={(event) => setSize(Number(event.target.value))}
            >
              {SIZE_OPTIONS.map((side) => (
                <option key={side} value={side}>
                  {side}×{side} casas
                </option>
              ))}
            </select>
          </div>
          <TextField
            label="Vida máxima"
            type="number"
            inputMode="numeric"
            min={0}
            value={hpMax}
            placeholder="Sem vida"
            error={errors.hpMax}
            disabled={pending}
            onChange={(event) => setHpMax(event.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={ownerId} className={styles.label}>
            Quem controla
          </label>
          <select
            id={ownerId}
            className={styles.select}
            value={owner}
            disabled={pending}
            onChange={(event) => setOwner(event.target.value)}
          >
            <option value={NO_OWNER}>Só o mestre (NPC, monstro)</option>
            {players.map((player) => (
              <option key={player.userId} value={player.userId}>
                {player.nickname}
              </option>
            ))}
          </select>
          {errors.ownerId && <p className={styles.error}>{errors.ownerId}</p>}
        </div>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={hidden}
            disabled={pending}
            onChange={(event) => setHidden(event.target.checked)}
          />
          Esconder dos jogadores (emboscada)
        </label>
        {failure && (
          <p role="alert" className={styles.error}>
            {failure}
          </p>
        )}
      </form>
    </Dialog>
  );
}
