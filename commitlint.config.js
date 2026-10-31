// Mensagens de commit no padrão Conventional Commits (feat:, fix:, chore:, refactor:...).
// O corpo pode ter linhas longas (ex: descrições em PT-BR e linhas Co-Authored-By).
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [0],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
