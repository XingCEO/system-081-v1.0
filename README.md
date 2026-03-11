# system-081-v1.0

# 早餐店 POS 系統

這是一套可直接本機啟動，也可直接部署到 Zeabur 的早餐店 POS monorepo。

專案包含三個前後台應用與一個 PostgreSQL 資料庫：

- `backend`：Node.js + Express + Prisma + Socket.IO API
- `frontend`：POS / Kiosk / QR 點餐 / KDS / 叫號屏
- `admin`：後台管理
- `postgres`：PostgreSQL 15

## 本機快速啟動

1. 安裝依賴

```bash
npm install
```

2. 啟動資料庫

```bash
docker compose up -d postgres
```

3. 建立資料表與種子資料

```bash
npm run db:migrate
npm run db:seed
```

4. 啟動三個服務

```bash
npm run dev
```

啟動後網址：

- 前台：`http://localhost:3000`
- 後端：`http://localhost:3001`
- 後台：`http://localhost:3002`

## Docker

本機容器啟動：

```bash
npm run docker:up
```

停止容器：

```bash
npm run docker:down
```

目前 `docker-compose.yml` 已包含：

- PostgreSQL 持久化 Volume
- Backend 圖片上傳 Volume
- Frontend / Admin runtime config 注入
- Backend 啟動時自動等待資料庫並執行 migration

## 預設帳號

- `admin / admin123`，PIN `0000`
- `manager / manager123`，PIN `1111`
- `staff01 / staff123`，PIN `2222`

## 測試與驗證

建置：

```bash
npm run build
```

Smoke test：

```bash
npm run test:smoke
```

API 健康檢查：

```text
http://localhost:3001/api/health
```

## Zeabur 部署

這個專案已調整成 Zeabur 友善部署模式，重點如下：

- 前台與後台改為 runtime config，不需要為了更換 API 網址重新 build
- Backend 支援 `UPLOAD_DIR`，可直接掛 Zeabur Persistent Storage
- Backend 會在啟動時等待資料庫連線，再執行 `prisma migrate deploy`
- 單一 Git 倉庫可拆成 `postgres / backend / frontend / admin` 四個服務部署

完整部署步驟請看：

- [docs/ZEABUR_DEPLOY.md](C:\Users\White CEO\Downloads\081-system最終版\docs\ZEABUR_DEPLOY.md)

## 環境變數

請先參考這些範例檔建立設定：

- [/.env.example](C:\Users\White CEO\Downloads\081-system最終版\.env.example)
- [/backend/.env.example](C:\Users\White CEO\Downloads\081-system最終版\backend\.env.example)
- [/frontend/.env.example](C:\Users\White CEO\Downloads\081-system最終版\frontend\.env.example)
- [/admin/.env.example](C:\Users\White CEO\Downloads\081-system最終版\admin\.env.example)

## Zeabur 部署後建議檢查

- Backend：`https://<backend-domain>/api/health`
- Frontend：登入、POS 點餐、KDS 即時狀態
- Admin：菜單圖片上傳、菜單匯入匯出、報表與設定頁

## 補充

- 圖片上傳預設會寫入 `backend/uploads`，在 Zeabur 請把 Persistent Storage 掛到 `/app/uploads`
- 若要正式長期保存圖片，仍建議後續接 S3 或 Cloudflare R2
- `PRISMA_DB_PUSH_FALLBACK` 只保留給本機容器相容用途，Zeabur 不建議設定
## QA Commands

```bash
npm run test:smoke
npm run test:system
npm run test:ui
npm run qa:full
```

Launch readiness details:
- [docs/LAUNCH_READINESS.md](C:\Users\White CEO\Downloads\081-system最終版\docs\LAUNCH_READINESS.md)
