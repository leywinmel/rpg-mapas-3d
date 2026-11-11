import { useRef, useState } from 'react';
import { CloudRain } from 'lucide-react';
import { Panel, SegmentedControl } from '@/components';
import {
  DAY_PHASE_LABELS,
  DAY_PHASES,
  WEATHER_KINDS,
  WEATHER_LABELS,
  type DayPhase,
  type TableWeather,
  type WeatherKind,
} from '@/domain';
import { useWeatherStore } from '@/features/scene';
import { reportError } from '@/lib/report-error';
import { useRoomControls, useRoomSession } from '../hooks/room-session-context';
import { getRoomsService } from '../services/rooms-service';
import styles from './rooms.module.css';

const WEATHER_OPTIONS = WEATHER_KINDS.map((value) => ({ value, label: WEATHER_LABELS[value] }));
const DAY_OPTIONS = DAY_PHASES.map((value) => ({ value, label: DAY_PHASE_LABELS[value] }));

/** O mestre troca o tempo e a hora da mesa; chega a todos pelo canal da mesa. */
function MasterControls({ table }: { table: TableWeather }) {
  const { room } = useRoomSession();
  const { replaceRoom } = useRoomControls();
  // Cliques seguidos entram numa fila: cada troca grava depois da anterior, e a resposta que
  // chega por último é sempre a mais nova (nenhum clique se perde nem volta atrás).
  const queue = useRef<Promise<void>>(Promise.resolve());
  const [shown, setShown] = useState<TableWeather | null>(null);

  function change(patch: Partial<TableWeather>) {
    setShown((current) => ({ ...(current ?? table), ...patch }));
    queue.current = queue.current.then(async () => {
      try {
        replaceRoom(await getRoomsService().setTableWeather(room.id, patch));
      } catch (error) {
        reportError(error, {
          userMessage: 'Não deu para mudar o clima da mesa.',
          hint: 'Confira a conexão e tente de novo.',
          context: { feature: 'rooms', action: 'table-weather' },
        });
      }
    });
    const settled = queue.current;
    void settled.then(() => {
      // Só a última troca da fila devolve o controle ao valor do banco.
      if (queue.current === settled) setShown(null);
    });
  }
  const value = shown ?? table;

  return (
    <>
      <div className={styles.weatherField}>
        <span className={styles.weatherLabel}>Tempo</span>
        <SegmentedControl<WeatherKind>
          label="Tempo da mesa"
          options={WEATHER_OPTIONS}
          value={value.weather}
          onChange={(weather) => change({ weather })}
        />
      </div>
      <div className={styles.weatherField}>
        <span className={styles.weatherLabel}>Hora</span>
        <SegmentedControl<DayPhase>
          label="Hora do dia na mesa"
          options={DAY_OPTIONS}
          value={value.dayPhase}
          onChange={(dayPhase) => change({ dayPhase })}
        />
      </div>
    </>
  );
}

/**
 * Clima da mesa (RPG-38, RPG-39): o mestre liga a chuva e escolhe a hora; cada pessoa pode
 * desligar a chuva só na própria tela (a escolha fica no navegador).
 */
export function WeatherPanel({ onClose }: { onClose: () => void }) {
  const { room, isGameMaster } = useRoomSession();
  const rainEnabled = useWeatherStore((state) => state.rainEnabled);
  const setRainEnabled = useWeatherStore((state) => state.setRainEnabled);
  const table = room.tableWeather;

  return (
    <Panel
      title="Clima da mesa"
      icon={<CloudRain size={18} />}
      onClose={onClose}
      className={styles.weatherPanel}
    >
      <div className={styles.weatherBody}>
        {isGameMaster ? (
          <MasterControls table={table} />
        ) : (
          <p className={styles.muted}>
            Tempo: {WEATHER_LABELS[table.weather]}. Hora: {DAY_PHASE_LABELS[table.dayPhase]}. Quem
            escolhe é o mestre.
          </p>
        )}
        <label className={styles.weatherCheck}>
          <input
            type="checkbox"
            checked={rainEnabled}
            onChange={(event) => setRainEnabled(event.target.checked)}
          />
          Mostrar a chuva na minha tela
        </label>
      </div>
    </Panel>
  );
}
