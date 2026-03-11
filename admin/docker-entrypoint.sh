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

exec sh -c "serve -s dist -l ${PORT:-3002}"
