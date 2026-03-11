# Zeabur Upload Checklist

This checklist is the fastest way to deploy the project on Zeabur with a single public domain.

## Services

Create these 5 services in one Zeabur project:

1. `postgres`
2. `backend`
3. `frontend`
4. `admin`
5. `gateway`

Only bind the public domain to `gateway`.

## Public Routes

- `/` -> `frontend`
- `/admin` -> `admin`
- `/api` -> `backend`
- `/socket.io` -> `backend`
- `/uploads` -> `backend`

## Root Directory

- `backend`: `backend`
- `frontend`: `frontend`
- `admin`: `admin`
- `gateway`: `gateway`

## Required Environment Variables

### `backend`

```env
DATABASE_URL=postgresql://...
JWT_SECRET=replace-with-a-long-secret
JWT_REFRESH_SECRET=replace-with-another-long-secret
RUN_MIGRATIONS=true
UPLOAD_DIR=/app/uploads
DATABASE_READY_RETRIES=20
DATABASE_READY_INTERVAL=3
DAILY_SALES_TARGET=5000
```

Optional but recommended:

```env
LINE_NOTIFY_TOKEN=
PRINTER_IP=
PRINTER_PORT=9100
FOODPANDA_WEBHOOK_SECRET=replace-me
UBEREATS_WEBHOOK_SECRET=replace-me
CORS_ORIGINS=https://your-domain
FRONTEND_URL=https://your-domain
ADMIN_URL=https://your-domain/admin
```

### `frontend`

```env
APP_BASE_PATH=/
VITE_API_BASE_URL=/api
VITE_SOCKET_URL=
```

### `admin`

```env
APP_BASE_PATH=/admin
VITE_API_BASE_URL=/api
```

### `gateway`

```env
PORT=8080
FRONTEND_UPSTREAM=frontend.zeabur.internal:3000
ADMIN_UPSTREAM=admin.zeabur.internal:3002
BACKEND_UPSTREAM=backend.zeabur.internal:3001
```

## Persistent Storage

Mount Zeabur Persistent Storage on `backend`:

```text
/app/uploads
```

## First Deploy Checks

After deployment, verify:

1. `https://your-domain/api/health`
2. `https://your-domain/login`
3. `https://your-domain/admin/login`
4. Uploading a menu image stores the file and still works after service restart

## Local Verification Before Upload

Run these commands locally:

```bash
npm install
npm run build
npm run qa:full
npm run qa:gateway
```

If all commands pass, the project is ready for Zeabur single-domain deployment.
