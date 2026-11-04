import { createFogState, isCellCovered } from '@/domain';
import { FOG_BRUSH_MAX_RADIUS } from '../constants';
import { useFogStore } from './fog-store';

const MAP_ID = '11111111-1111-4111-8111-111111111111';

describe('fog store', () => {
  beforeEach(() => {
    useFogStore.getState().reset();
    useFogStore.getState().setMap(MAP_ID);
    useFogStore.getState().setLoaded(createFogState({ width: 4, depth: 4 }, true));
  });

  it('shouldMarkAPaintedStrokeAsPendingSave', () => {
    useFogStore.getState().paintRect({ x: 1, z: 1, width: 2, depth: 1 }, true);
    const { fog, saveStatus } = useFogStore.getState();
    expect(saveStatus).toBe('pending');
    expect(fog && isCellCovered(fog, { x: 2, z: 1 })).toBe(true);
  });

  it('shouldIgnoreAStrokeThatChangesNothing', () => {
    const before = useFogStore.getState().fog;
    useFogStore.getState().paintRect({ x: 0, z: 0, width: 1, depth: 1 }, false);
    expect(useFogStore.getState().fog).toBe(before);
    expect(useFogStore.getState().saveStatus).toBe('saved');
  });

  it('shouldStayPendingWhenTheSavedStateIsAlreadyOld', () => {
    const saved = useFogStore.getState().fog;
    useFogStore.getState().fill(true);
    if (!saved) throw new Error('sem névoa');
    useFogStore.getState().markSaved(saved);
    expect(useFogStore.getState().saveStatus).toBe('pending');
  });

  it('shouldClampTheBrushRadius', () => {
    useFogStore.getState().setTool({ radius: 99 });
    expect(useFogStore.getState().tool.radius).toBe(FOG_BRUSH_MAX_RADIUS);
  });

  it('shouldForgetTheFogWhenTheMapChanges', () => {
    useFogStore.getState().setMap('22222222-2222-4222-8222-222222222222');
    expect(useFogStore.getState().fog).toBeNull();
  });
});
