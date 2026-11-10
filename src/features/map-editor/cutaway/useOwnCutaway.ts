import { useCallback, useState } from 'react';
import type { Cutaway } from '@/domain/map-v2';
import { browserCutawayStorage, readOwnCutaway, writeOwnCutaway } from './cutaway-storage';

/** O corte que o mestre olha sozinho nesta mesa, lembrado no navegador dele. */
export function useOwnCutaway(roomId: string): [Cutaway, (cut: Cutaway) => void] {
  const [own, setState] = useState<Cutaway>(() => readOwnCutaway(browserCutawayStorage(), roomId));
  const setOwn = useCallback(
    (cut: Cutaway) => {
      writeOwnCutaway(browserCutawayStorage(), roomId, cut);
      setState(cut);
    },
    [roomId],
  );
  return [own, setOwn];
}
