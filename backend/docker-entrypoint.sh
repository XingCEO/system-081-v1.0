#!/bin/sh
set -e

npm run prisma:generate

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  if ! npm run prisma:deploy; then
    if [ "${PRISMA_DB_PUSH_FALLBACK:-false}" = "true" ]; then
      echo "prisma migrate deploy failed, fallback to prisma db push..."
      npx prisma db push --accept-data-loss
    else
      echo "prisma migrate deploy failed and fallback is disabled."
      exit 1
    fi
  fi
fi

exec node src/index.js
