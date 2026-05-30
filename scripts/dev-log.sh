#!/usr/bin/env bash
# Inicia o servidor em modo dev e escreve logs em .log/<name>-<timestamp>.log
# Uso: ./scripts/dev-log.sh <name> <start-command>
# Ex:  ./scripts/dev-log.sh api "npm run start:dev:local"
set -euo pipefail

NAME="${1:-app}"
CMD="${2:-npm run start:dev}"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
LOG_DIR="$(dirname "$0")/../.log"
LOG_FILE="${LOG_DIR}/${NAME}-${TIMESTAMP}.log"

mkdir -p "$LOG_DIR"

echo "▶ Iniciando ${NAME} — logs em ${LOG_FILE}"
exec $CMD 2>&1 | tee "$LOG_FILE"
