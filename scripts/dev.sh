#!/usr/bin/env bash
# ============================================================
#  dev.sh - controle do ambiente local (Linux/Mac)
#  Uso:  ./scripts/dev.sh [start|stop|restart|status|logs]
#  start: sobe o Supabase local (Docker), gera o .env.local com as
#         chaves locais e abre o site em http://localhost:5173
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

ACAO="${1:-start}"

checar_docker() {
  if ! docker info >/dev/null 2>&1; then
    echo "[erro] O Docker não está rodando. Abra o Docker e tente de novo."
    exit 1
  fi
}

subir_banco() {
  checar_docker
  [ -d node_modules ] || npm install
  npx supabase start
  npx supabase status -o env \
    --override-name api.url=VITE_SUPABASE_URL \
    --override-name auth.anon_key=VITE_SUPABASE_ANON_KEY | grep '^VITE_' > .env.local
  echo "[ok] Supabase local no ar. Painel do banco: http://127.0.0.1:54323"
}

case "$ACAO" in
  start)   subir_banco && npm run dev ;;
  stop)    npx supabase stop ;;
  restart) npx supabase stop && subir_banco && npm run dev ;;
  status)  npx supabase status ;;
  logs)    docker ps --filter "name=supabase_" --format "table {{.Names}}\t{{.Status}}" ;;
  *)
    echo "Uso: ./scripts/dev.sh [start|stop|restart|status|logs]"
    exit 1
    ;;
esac
