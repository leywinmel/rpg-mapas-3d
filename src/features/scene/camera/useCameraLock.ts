import { useThree } from '@react-three/fiber';

type Toggleable = { enabled: boolean };

function isToggleable(value: unknown): value is Toggleable {
  return typeof value === 'object' && value !== null && 'enabled' in value;
}

/**
 * Trava a câmera enquanto algo da cena é arrastado com o botão esquerdo (um token, um carro):
 * senão o mesmo arraste também giraria a vista. Só vale dentro do Canvas.
 */
export function useCameraLock(): (locked: boolean) => void {
  const getState = useThree((state) => state.get);
  return (locked: boolean) => {
    // Lido na hora: os controles da câmera são do three, não estado do React.
    const { controls } = getState();
    if (isToggleable(controls)) controls.enabled = !locked;
  };
}
