# Zeabur 部署指南

本專案要上 Zeabur 時，建議拆成四個服務：

1. PostgreSQL
2. Backend
3. Frontend
4. Admin

## 為什麼不能直接丟 `docker-compose.yml`

Zeabur 官方文件目前明確說明不支援直接從 Docker Compose YAML 部署，所以這份 `docker-compose.yml` 主要是給本機與測試環境使用；上 Zeabur 時請改用同一個 Git 倉庫分別建立多個服務。

## 建議部署順序

1. 先建立 Zeabur Project
2. 加入 PostgreSQL 服務
3. 部署 Backend
4. Backend 拿到公開網址後，再部署 Frontend 與 Admin
5. 到 Backend 執行一次 seed 指令

## 服務設定

### 1. PostgreSQL

在 Zeabur 新增 PostgreSQL 服務即可，不需要額外寫 Dockerfile。

部署完成後，把 Zeabur 提供的連線字串填到 Backend 的 `DATABASE_URL`。

### 2. Backend 服務

- Root Directory：`backend`
- Watch Paths：`/backend`
- Deploy Method：Dockerfile

建議變數：

```env
DATABASE_URL=<Zeabur PostgreSQL 連線字串>
JWT_SECRET=<自行產生>
JWT_REFRESH_SECRET=<自行產生>
LINE_NOTIFY_TOKEN=
PRINTER_IP=
PRINTER_PORT=9100
FOODPANDA_WEBHOOK_SECRET=xxx
UBEREATS_WEBHOOK_SECRET=xxx
DAILY_SALES_TARGET=5000
RUN_MIGRATIONS=true
FRONTEND_URL=https://<frontend-domain>
ADMIN_URL=https://<admin-domain>
CORS_ORIGINS=https://<frontend-domain>,https://<admin-domain>
```

說明：

- `PORT` 不需要手動設定，Zeabur 會自動注入。
- `RUN_MIGRATIONS=true` 時，容器啟動會自動跑 `prisma migrate deploy`。
- `PRISMA_DB_PUSH_FALLBACK` 在 Zeabur 請保持關閉或不要設定，避免 production 資料庫在 migration 失敗時退回 `db push`。
- 前端與後台網址拿到之後，記得回填 `FRONTEND_URL`、`ADMIN_URL`、`CORS_ORIGINS`。

### 3. Frontend 服務

- Root Directory：`frontend`
- Watch Paths：`/frontend`
- Deploy Method：Dockerfile

建議變數：

```env
VITE_API_BASE_URL=https://<backend-domain>/api
VITE_SOCKET_URL=https://<backend-domain>
```

說明：

- 這兩個都是 Vite build-time 變數，修改後需要重新部署才會生效。
- 本專案的 `frontend/Dockerfile` 已經補了 `ARG` 與 `ENV`，可直接讓 Zeabur 在 multi-stage build 時注入。

### 4. Admin 服務

- Root Directory：`admin`
- Watch Paths：`/admin`
- Deploy Method：Dockerfile

建議變數：

```env
VITE_API_BASE_URL=https://<backend-domain>/api
```

## 首次部署後要做的事

### 1. 確認 migration

如果 Backend 成功啟動，而且 `RUN_MIGRATIONS=true`，通常 migration 會自動完成。

若你要手動執行，請到 Backend 服務頁面使用 Zeabur 的 Execute Command：

```bash
npx prisma migrate deploy
```

### 2. 匯入 Seed 資料

同樣在 Backend 的 Execute Command 執行：

```bash
node prisma/seed.js
```

### 3. 驗證健康檢查

打開：

```text
https://<backend-domain>/api/health
```

應回傳 `success: true`。

## 建議的 Zeabur 設定習慣

### Root Directory

這個 monorepo 一定要分別指定：

- Backend：`backend`
- Frontend：`frontend`
- Admin：`admin`

否則 Zeabur 會把整個專案當成同一個根目錄處理，建置與重部署會很混亂。

### Watch Paths

建議分開設定：

- Backend：`/backend`
- Frontend：`/frontend`
- Admin：`/admin`

這樣你只改前端時，不會把後端也一起重建。

## 常見問題

### 前端畫面打得開，但 API 都 404

通常是 `VITE_API_BASE_URL` 沒設，或設成了舊網址。因為 Vite 在 build 時就把這個值寫進靜態檔案裡，所以改完變數後要重新部署 Frontend / Admin。

### Socket.IO 連不上

請確認：

1. `VITE_SOCKET_URL` 指向 Backend 公開網址
2. Backend 的 `CORS_ORIGINS` 有包含 Frontend 網域
3. Backend 已正常對外提供 `/socket.io`

### Backend 啟動後立刻失敗

先檢查：

1. `DATABASE_URL` 是否正確
2. PostgreSQL 服務是否已完成建立
3. 是否有舊資料庫結構與 migration 紀錄不一致的情況

## 官方文件

- Dockerfile 部署：[Deploying with Dockerfile](https://zeabur.com/docs/en-US/deploy/dockerfile)
- Root Directory：[Custom Root Directory](https://zeabur.com/docs/en-US/deploy/root-directory)
- Watch Paths：[觸發路徑](https://zeabur.com/docs/zh-TW/deploy/watch-paths)
- Environment Variables：[Setting Environment Variables](https://zeabur.com/docs/es-ES/deploy/variables)
- Execute Command：[執行命令](https://zeabur.com/docs/zh-TW/deploy/command-execution)
