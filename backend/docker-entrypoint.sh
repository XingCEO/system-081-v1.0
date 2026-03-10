#!/bin/sh
set -e

npm run prisma:generate
mkdir -p "${UPLOAD_DIR:-/app/uploads}"

if [ -n "${DATABASE_URL:-}" ]; then
  attempt=1
  max_attempts="${DATABASE_READY_RETRIES:-20}"
  wait_seconds="${DATABASE_READY_INTERVAL:-3}"

  until node <<'EOF'
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

prisma.$connect()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async () => {
    try {
      await prisma.$disconnect();
    } catch {
      // Ignore disconnect errors while probing startup readiness.
    }
    process.exit(1);
  });
EOF
  do
    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "database is not reachable after ${max_attempts} attempts."
      exit 1
    fi

    echo "database is not ready yet (${attempt}/${max_attempts}), retrying in ${wait_seconds}s..."
    attempt=$((attempt + 1))
    sleep "$wait_seconds"
  done
fi

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
