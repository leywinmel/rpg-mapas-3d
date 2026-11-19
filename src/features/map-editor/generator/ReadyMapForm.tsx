import { useId, type FormEvent } from 'react';
import { TextField } from '@/components';
import { READY_MAPS, readyMap } from '@/domain/map-gen';
import { MAX_MAP_NAME_LENGTH } from '../editor/map-list';
import panel from '../components/SidePanel.module.css';
import type { ReadyMapValues } from './ready-form';
import styles from './GenerateMap.module.css';

/** Imagem vista de cima de cada mapa pronto, feita na própria cena. */
const READY_MAP_IMAGES: Readonly<Record<string, string>> = {
  navio: '/assets/ready/navio.webp',
  cripta: '/assets/ready/cripta.webp',
  caverna: '/assets/ready/caverna.webp',
  deserto: '/assets/ready/deserto.webp',
  porto: '/assets/ready/porto.webp',
  'vila-ponte': '/assets/ready/vila-ponte.webp',
  'burgo-monte': '/assets/ready/burgo-monte.webp',
  'bairro-orla': '/assets/ready/bairro-orla.webp',
  'centro-cidade': '/assets/ready/centro-cidade.webp',
  'colonia-astra': '/assets/ready/colonia-astra.webp',
  'estacao-vega': '/assets/ready/estacao-vega.webp',
};

type FieldsProps = {
  formId: string;
  values: ReadyMapValues;
  error: string | undefined;
  disabled: boolean;
  onChange: (values: ReadyMapValues) => void;
  onSubmit: () => void;
};

/** Biblioteca de mapas prontos: um cartão por mapa e o nome que ele vai ter na mesa. */
export function ReadyMapFields({
  formId,
  values,
  error,
  disabled,
  onChange,
  onSubmit,
}: FieldsProps) {
  const groupName = useId();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  const choose = (mapId: string) => {
    const previous = readyMap(values.mapId);
    const next = readyMap(mapId);
    // O nome acompanha a escolha enquanto o mestre não escreveu um nome dele.
    const keepName = values.name.trim() !== '' && values.name !== previous?.name;
    onChange({ mapId, name: keepName ? values.name : (next?.name ?? values.name) });
  };
  return (
    <form id={formId} className={panel.form} onSubmit={submit} noValidate>
      <fieldset className={styles.fields} disabled={disabled}>
        <legend className={panel.label}>Mapas prontos</legend>
        <div className={styles.readyList}>
          {READY_MAPS.map((ready) => (
            <label key={ready.id} className={styles.readyCard}>
              <input
                type="radio"
                name={groupName}
                className={styles.readyRadio}
                checked={values.mapId === ready.id}
                onChange={() => choose(ready.id)}
              />
              {READY_MAP_IMAGES[ready.id] && (
                <img
                  className={styles.readyImage}
                  src={READY_MAP_IMAGES[ready.id]}
                  alt=""
                  loading="lazy"
                />
              )}
              <span className={styles.readyText}>
                <span className={styles.readyName}>{ready.name}</span>
                <span className={styles.readyDescription}>{ready.description}</span>
                <span className={styles.readySize}>
                  {ready.size.width} × {ready.size.depth} casas
                </span>
              </span>
            </label>
          ))}
        </div>
        <TextField
          label="Nome"
          value={values.name}
          maxLength={MAX_MAP_NAME_LENGTH}
          error={error}
          onChange={(event) => onChange({ ...values, name: event.target.value })}
        />
      </fieldset>
    </form>
  );
}
