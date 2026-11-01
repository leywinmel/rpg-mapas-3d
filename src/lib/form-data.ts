/** Lê os campos de texto de um <form> para validar com zod (arquivos ficam de fora). */
export function readForm(form: HTMLFormElement): Record<string, string> {
  const values: Record<string, string> = {};
  new FormData(form).forEach((value, key) => {
    if (typeof value === 'string') values[key] = value;
  });
  return values;
}
