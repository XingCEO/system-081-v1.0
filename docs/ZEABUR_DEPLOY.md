# Zeabur 部署指南

這份專案已整理成可直接從 GitHub 匯入 Zeabur 的狀態，建議拆成四個服務：

1. `postgres`
2. `backend`
3. `frontend`
4. `admin`

Zeabur 官方相關說明可參考：

- [Deploying with Dockerfile](https://zeabur.com/docs/en-US/deploy/dockerfile)
- [Custom Root Directory](https://zeabur.com/docs/en-US/deploy/root-directory)
- [Watch Paths](https://zeabur.com/docs/zh-TW/deploy/watch-paths)
- [Environment Variables](https://zeabur.com/docs/es-ES/deploy/variables)
- [Command Execution](https://zeabur.com/docs/zh-TW/deploy/command-execution)
- [Persistent Storage](https://zeabur.com/docs/en-US/prebuilt/persistent-storage)

## 服務設定總表

| 服務 | Root Directory | Watch Paths | Deploy Method | Port | 額外設定 |
| --- | --- | --- | --- | --- | --- |
| `postgres` | `.` | `/` | Zeabur PostgreSQL | Zeabur 自管 | 建議直接用 Zeabur 內建 PostgreSQL |
| `backend` | `backend` | `/backend` | Dockerfile | Zeabur 自動注入 `PORT` | 掛 Persistent Storage 到 `/app/uploads` |
| `frontend` | `frontend` | `/frontend` | Dockerfile | Zeabur 自動注入 `PORT` | runtime config 讀取 `VITE_API_BASE_URL`、`VITE_SOCKET_URL` |
| `admin` | `admin` | `/admin` | Dockerfile | Zeabur 自動注入 `PORT` | runtime config 讀取 `VITE_API_BASE_URL` |

## 部署順序

建議照這個順序部署：

1. 建立 `postgres`
2. 建立 `backend`
3. 等 `backend` 出現公開網域
4. 建立 `frontend`
5. 建立 `admin`
6. 把 `frontend`、`admin` 的公開網域回填到 `backend` 的 CORS 設定後重新部署一次

## PostgreSQL

直接在 Zeabur 新增 PostgreSQL 服務即可。

建立完成後，請把 Zeabur 顯示的 PostgreSQL 連線字串貼到 `backend` 的 `DATABASE_URL`。

## Backend

### Root Directory

```text
backend
```

### Watch Paths

```text
/backend
```

### Deploy Method

```text
Dockerfile
```

### Persistent Storage

請在 Zeabur 幫 `backend` 掛一個 Persistent Storage，掛載路徑：

```text
/app/uploads
```

這樣菜單圖片與上傳檔就不會在重新部署後消失。

### 環境變數

```env
DATABASE_URL=postgresql://...
JWT_SECRET=replace-with-a-long-secret
JWT_REFRESH_SECRET=replace-with-another-long-secret
LINE_NOTIFY_TOKEN=
PRINTER_IP=
PRINTER_PORT=9100
FOODPANDA_WEBHOOK_SECRET=replace-me
UBEREATS_WEBHOOK_SECRET=replace-me
DAILY_SALES_TARGET=5000
RUN_MIGRATIONS=true
UPLOAD_DIR=/app/uploads
DATABASE_READY_RETRIES=20
DATABASE_READY_INTERVAL=3
FRONTEND_URL=
ADMIN_URL=
CORS_ORIGINS=
```

### 注意事項

- `RUN_MIGRATIONS=true` 要保留，容器啟動時會自動跑 `prisma migrate deploy`
- 不要在 Zeabur 設 `PRISMA_DB_PUSH_FALLBACK`
- 第一次部署時如果 `FRONTEND_URL / ADMIN_URL / CORS_ORIGINS` 先留空，Backend 也能先啟動
- 等前台與後台網域確定後，再補上這三個值並重新部署 Backend

### 建議執行命令

若你要手動補跑 migration 或 seed，可在 Backend 的 Execute Command 執行：

```bash
npx prisma migrate deploy
node prisma/seed.js
```

## Frontend

### Root Directory

```text
frontend
```

### Watch Paths

```text
/frontend
```

### Deploy Method

```text
Dockerfile
```

### 環境變數

```env
VITE_API_BASE_URL=https://<backend-domain>/api
VITE_SOCKET_URL=https://<backend-domain>
```

### 說明

Frontend 已改成 runtime config 注入模式。

也就是說：

- Zeabur 只要設定環境變數，不需要修改 Dockerfile
- 後續如果 Backend 網域變更，只需要更新環境變數並重新部署 Frontend

## Admin

### Root Directory

```text
admin
```

### Watch Paths

```text
/admin
```

### Deploy Method

```text
Dockerfile
```

### 環境變數

```env
VITE_API_BASE_URL=https://<backend-domain>/api
```

### 說明

Admin 也已改成 runtime config 注入模式，與 Frontend 相同，不需要為了 API 網址重寫 build-time 變數。

## Backend 最終 CORS 設定範例

等 Frontend 與 Admin 網域都出來後，請把 Backend 補成類似這樣：

```env
FRONTEND_URL=https://your-frontend.zeabur.app
ADMIN_URL=https://your-admin.zeabur.app
CORS_ORIGINS=https://your-frontend.zeabur.app,https://your-admin.zeabur.app
```

## 驗證清單

### Backend

打開：

```text
https://<backend-domain>/api/health
```

預期回應：

```json
{"success":true,"data":{"status":"ok"}}
```

### Frontend

請至少確認：

- 可以開啟登入頁
- 可以載入菜單
- KDS 能收到 Socket.IO 訂單狀態

### Admin

請至少確認：

- 可以登入
- 菜單 CRUD 正常
- 菜單圖片上傳後可立即顯示
- 菜單匯入 / 匯出可用

## 常見問題

### 1. Frontend 或 Admin 連不到 API

請先檢查：

- `VITE_API_BASE_URL` 是否指向 `https://<backend-domain>/api`
- Backend 的 `CORS_ORIGINS` 是否已加入前台與後台網域

### 2. Socket.IO 沒收到事件

請檢查：

- `VITE_SOCKET_URL` 是否為 `https://<backend-domain>`
- Backend 網域是否可直接從瀏覽器打開

### 3. 菜單圖片部署後消失

通常代表 `backend` 沒有掛 Persistent Storage。

請確認掛載路徑是：

```text
/app/uploads
```

### 4. Backend 第一次部署就失敗

請先確認：

- `DATABASE_URL` 正確
- `RUN_MIGRATIONS=true`
- 沒有設定 `PRISMA_DB_PUSH_FALLBACK`

目前 backend 容器已加入資料庫等待與重試機制，如果 PostgreSQL 正在初始化，通常重新部署一次也能正常完成。
