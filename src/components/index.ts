// Componentes genéricos de interface, compartilhados por todas as features.
export { Avatar } from './Avatar/Avatar';
export { avatarColorIndex, initialsOf } from './Avatar/avatar-utils';
export { Button, type ButtonProps } from './Button/Button';
export { buttonClassName } from './Button/button-look';
export { ButtonLink } from './Button/ButtonLink';
export { Dialog } from './Dialog/Dialog';
export { ErrorBoundary } from './ErrorBoundary';
export { IconButton } from './IconButton/IconButton';
export { Panel } from './Panel/Panel';
export { SegmentedControl, type SegmentOption } from './SegmentedControl/SegmentedControl';
export { Spinner } from './Spinner/Spinner';
export { EmptyState, ErrorState, LoadingState } from './States/States';
export { TextAreaField, TextField } from './TextField/TextField';
export { ThemeToggle } from './ThemeToggle';
export { notify, useToastStore } from './toast/toast-store';
export { ToastViewport } from './toast/ToastViewport';
export { Toolbar, ToolbarSeparator } from './Toolbar/Toolbar';
