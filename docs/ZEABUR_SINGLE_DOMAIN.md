# Zeabur Single-Domain Deployment

This project now supports a single public domain gateway layout:

- `/` -> `frontend`
- `/admin` -> `admin`
- `/api` -> `backend`
- `/socket.io` -> `backend`
- `/uploads` -> `backend`

## Recommended Zeabur Services

1. `postgres`
2. `backend`
3. `frontend`
4. `admin`
5. `gateway`

Bind the public custom domain only to `gateway`.

## Gateway Environment Variables

```env
PORT=8080
FRONTEND_UPSTREAM=frontend.zeabur.internal:3000
ADMIN_UPSTREAM=admin.zeabur.internal:3002
BACKEND_UPSTREAM=backend.zeabur.internal:3001
```

## Frontend Environment Variables

```env
APP_BASE_PATH=/
VITE_API_BASE_URL=/api
VITE_SOCKET_URL=
```

## Admin Environment Variables

```env
APP_BASE_PATH=/admin
VITE_API_BASE_URL=/api
```

## Backend Environment Variables

When everything is served behind the same public domain, backend can keep:

```env
RUN_MIGRATIONS=true
UPLOAD_DIR=/app/uploads
```

You can still keep `CORS_ORIGINS` empty or set it to the single public domain explicitly.

## Result

After deployment:

- `https://your-domain/` opens the customer / POS frontend
- `https://your-domain/admin` opens the admin console
- `https://your-domain/api/health` reaches the backend
