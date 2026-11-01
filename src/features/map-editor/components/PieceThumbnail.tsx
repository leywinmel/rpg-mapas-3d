import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import type { PieceIcon } from '@/features/scene';
import { logger } from '@/lib/logger';
import { PIECE_ICONS } from './piece-icons';
import styles from './PieceThumbnail.module.css';

export type ThumbnailSource =
  { type: 'piece'; key: string } | { type: 'model'; url: string | null };

const ICON_SIZE = 22;

function renderThumbnail(pieceKey: string | null, modelUrl: string | null): Promise<string> | null {
  if (!pieceKey && !modelUrl) return null;
  // O renderizador usa three.js: carregado sob demanda para não pesar no pacote do painel.
  return import('../thumbnails/thumbnail-renderer').then((renderer) =>
    pieceKey
      ? renderer.renderPieceThumbnail(pieceKey)
      : renderer.renderModelThumbnail(modelUrl ?? ''),
  );
}

/** Miniatura 3D da peça, com o ícone no lugar enquanto carrega ou se falhar. */
export function PieceThumbnail({ source, icon }: { source: ThumbnailSource; icon?: PieceIcon }) {
  const [image, setImage] = useState<{ for: string; src: string } | null>(null);
  const pieceKey = source.type === 'piece' ? source.key : null;
  const modelUrl = source.type === 'model' ? source.url : null;
  const sourceKey = pieceKey ? `piece:${pieceKey}` : `model:${modelUrl}`;

  useEffect(() => {
    const pending = renderThumbnail(pieceKey, modelUrl);
    if (!pending) return;
    let cancelled = false;
    pending
      .then((src) => {
        if (!cancelled) setImage({ for: sourceKey, src });
      })
      .catch((error: unknown) => {
        // Sem miniatura o ícone continua no lugar; não vale um aviso na tela.
        logger.warn('Miniatura não gerada', { feature: 'map-editor', source: sourceKey }, error);
      });
    return () => {
      cancelled = true;
    };
  }, [pieceKey, modelUrl, sourceKey]);

  const Icon = icon ? PIECE_ICONS[icon] : Package;
  return (
    <span className={styles.thumbnail} aria-hidden="true">
      {image?.for === sourceKey ? (
        <img src={image.src} alt="" className={styles.image} draggable={false} />
      ) : (
        <Icon size={ICON_SIZE} />
      )}
    </span>
  );
}
