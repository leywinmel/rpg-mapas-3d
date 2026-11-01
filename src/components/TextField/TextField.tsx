import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';
import styles from './TextField.module.css';

type FieldTextProps = {
  label: string;
  /** Explicação curta abaixo do campo. */
  hint?: string;
  /** Mensagem de validação; deixa o campo vermelho e é lida pelo leitor de tela. */
  error?: string;
};

function useFieldIds(id: string | undefined, hint?: string, error?: string) {
  const generated = useId();
  const fieldId = id ?? generated;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return { fieldId, hintId, errorId, describedBy };
}

function FieldFooter({
  hint,
  error,
  hintId,
  errorId,
}: FieldTextProps & { hintId?: string; errorId?: string }) {
  return (
    <>
      {hint && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </>
  );
}

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & FieldTextProps;

export function TextField({ label, hint, error, id, className, ...rest }: TextFieldProps) {
  const { fieldId, hintId, errorId, describedBy } = useFieldIds(id, hint, error);
  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={fieldId} className={styles.label}>
        {label}
      </label>
      <input
        id={fieldId}
        className={cx(styles.input, error && styles.invalid)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      <FieldFooter label={label} hint={hint} error={error} hintId={hintId} errorId={errorId} />
    </div>
  );
}

export type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldTextProps;

export function TextAreaField({ label, hint, error, id, className, ...rest }: TextAreaFieldProps) {
  const { fieldId, hintId, errorId, describedBy } = useFieldIds(id, hint, error);
  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={fieldId} className={styles.label}>
        {label}
      </label>
      <textarea
        id={fieldId}
        className={cx(styles.input, error && styles.invalid)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      <FieldFooter label={label} hint={hint} error={error} hintId={hintId} errorId={errorId} />
    </div>
  );
}
