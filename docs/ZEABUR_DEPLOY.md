# Zeabur 部署指南

本專案建議在 Zeabur 拆成 4 個服務：

1. PostgreSQL
2. Backend
3. Frontend
4. Admin

## 1. PostgreSQL

直接使用 Zeabur 內建 PostgreSQL 服務即可。  
建立完成後，將資料庫連線字串填到 Backend 的 `DATABASE_URL`。

## 2. Backend 服務

Zeabur 設定：

- Root Directory：`backend`
- Watch Paths：`/backend`
- Deploy Method：`Dockerfile`

建議環境變數：

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

注意事項：

- `RUN_MIGRATIONS=true` 會在容器啟動時執行 `prisma migrate deploy`
- 不要在 Zeabur 使用 `PRISMA_DB_PUSH_FALLBACK`
- `PORT` 由 Zeabur 注入，不需要手動填寫

## 3. Frontend 服務

Zeabur 設定：

- Root Directory：`frontend`
- Watch Paths：`/frontend`
- Deploy Method：`Dockerfile`

環境變數：

```env
VITE_API_BASE_URL=https://<backend-domain>/api
VITE_SOCKET_URL=https://<backend-domain>
```

## 4. Admin 服務

Zeabur 設定：

- Root Directory：`admin`
- Watch Paths：`/admin`
- Deploy Method：`Dockerfile`

環境變數：

```env
VITE_API_BASE_URL=https://<backend-domain>/api
```

## 首次上線流程

1. 先建立 PostgreSQL
2. 部署 Backend
3. 到 Backend 的 Execute Command 執行：

```bash
npx prisma migrate deploy
node prisma/seed.js
```

4. 部署 Frontend
5. 部署 Admin

## 健康檢查

Backend 成功後請確認：

```text
https://<backend-domain>/api/health
```

應回傳：

```json
{"success":true,"data":{"status":"ok"}}
```

## 常見問題

### Frontend / Admin 打不到 API

請檢查：

- `VITE_API_BASE_URL` 是否為完整後端網址
- Backend 的 `CORS_ORIGINS` 是否包含前台與後台網址

### Socket.IO 沒連上

請檢查：

- `VITE_SOCKET_URL` 是否為後端網址
- Backend 是否正常啟動 `Socket.IO`

### Backend 啟動但資料表不存在

請在 Backend Execute Command 再執行一次：

```bash
npx prisma migrate deploy
```

### Seed 沒有資料

請在 Backend Execute Command 執行：

```bash
node prisma/seed.js
```

## 補充

- Zeabur 上傳圖片會存於容器檔案系統，若你要長期保存，建議後續改接 S3 / R2
- 如果要正式商用，建議把備份檔同步到外部儲存
