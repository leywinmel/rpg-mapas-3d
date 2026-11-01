import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { IconButton } from './IconButton/IconButton';

export function ThemeToggle() {
  const theme = useTheme((state) => state.theme);
  const toggleTheme = useTheme((state) => state.toggleTheme);
  const isDark = theme === 'dark';
  return (
    <IconButton
      label={isDark ? 'Usar tema claro' : 'Usar tema escuro'}
      icon={isDark ? <Sun size={18} /> : <Moon size={18} />}
      onClick={toggleTheme}
    />
  );
}
