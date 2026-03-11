#!/bin/sh
set -e

node <<'EOF'
const fs = require('fs');
const path = require('path');

const config = {
  apiBaseUrl: process.env.VITE_API_BASE_URL || '/api',
  appBasePath: process.env.APP_BASE_PATH || '/'
};

fs.writeFileSync(
  path.join('/app', 'dist', 'runtime-config.js'),
  `window.__APP_CONFIG__ = ${JSON.stringify(config, null, 2)};\n`
);
EOF

PORT_VALUE="${PORT:-3002}"

case "$PORT_VALUE" in
  tcp://*)
    LISTEN_TARGET="$PORT_VALUE"
    ;;
  *:*)
    LISTEN_TARGET="tcp://$PORT_VALUE"
    ;;
  *)
    LISTEN_TARGET="tcp://0.0.0.0:$PORT_VALUE"
    ;;
esac

exec serve -s dist -l "$LISTEN_TARGET"
