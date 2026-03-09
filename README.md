# 早餐店完整 POS 系統

這是一套以 `backend / frontend / admin` 三端拆分的早餐店 POS monorepo，包含收銀台 POS、Kiosk、QR 點餐、KDS 廚房看板、叫號畫面，以及後台管理系統。

## 專案結構

```text
breakfast-pos/
├── backend/          # Node.js + Express + Prisma + Socket.IO
├── frontend/         # React 18 + Vite + TailwindCSS（POS / Kiosk / QR / KDS / Caller）
├── admin/            # React 18 + Vite + TailwindCSS（後台管理）
├── docker-compose.yml
└── README.md
```

## 技術棧

- 前端：React 18、Vite、TailwindCSS、Zustand、React Query
- 後端：Node.js、Express、Prisma、Socket.IO
- 資料庫：PostgreSQL
- 認證：JWT、bcryptjs
- 匯出：exceljs、pdfkit
- 列印：node-thermal-printer

## 本機開發

### 1. 安裝依賴

```bash
npm install
```

### 2. 啟動 PostgreSQL

```bash
docker compose up -d postgres
```

### 3. 建立資料庫結構並匯入 Seed

```bash
npm run db:migrate
npm run db:seed
```

### 4. 啟動三端開發服務

```bash
npm run dev
```

開啟網址：

- POS / Kiosk / QR / KDS / Caller：`http://localhost:3000`
- Backend API：`http://localhost:3001/api`
- Admin：`http://localhost:3002`

## Docker 啟動

本專案已提供可直接運行的 Docker 設定，前後端與後台會使用容器建置，前端 build 時也會自動注入本機 API / Socket 位址。

```bash
npm run docker:up
```

停止服務：

```bash
npm run docker:down
```

如果你想連資料一起清掉重新初始化：

```bash
docker compose down -v
```

## 預設帳號

- `admin / admin123`，PIN：`0000`
- `manager / manager123`，PIN：`1111`
- `staff01 / staff123`，PIN：`2222`

## 環境變數

### 根目錄 `.env`

可參考 [`.env.example`](C:\Users\White CEO\Downloads\081-system最終版\.env.example)：

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `LINE_NOTIFY_TOKEN`
- `PRINTER_IP`
- `PRINTER_PORT`
- `FOODPANDA_WEBHOOK_SECRET`
- `UBEREATS_WEBHOOK_SECRET`
- `DAILY_SALES_TARGET`
- `FRONTEND_URL`
- `ADMIN_URL`
- `CORS_ORIGINS`
- `BACKEND_PORT`

### 各服務 build / deploy 變數

- Backend：[`backend/.env.example`](C:\Users\White CEO\Downloads\081-system最終版\backend\.env.example)
- Frontend：[`frontend/.env.example`](C:\Users\White CEO\Downloads\081-system最終版\frontend\.env.example)
- Admin：[`admin/.env.example`](C:\Users\White CEO\Downloads\081-system最終版\admin\.env.example)

## Zeabur 部署

Zeabur 不直接部署 `docker-compose.yml`，所以要把 `backend`、`frontend`、`admin`、`postgres` 當成四個服務分開部署。專案已經補好對應的 Dockerfile、動態 `PORT` 與 Vite build-time 變數注入。

完整步驟請看：

- [Zeabur 部署指南](C:\Users\White CEO\Downloads\081-system最終版\docs\ZEABUR_DEPLOY.md)

## 部署注意事項

- `frontend` 與 `admin` 是 Vite 靜態站，`VITE_API_BASE_URL` 必須在 build 前就設定好。
- `frontend` 的 Socket 連線會優先讀取 `VITE_SOCKET_URL`，若未提供則會從 `VITE_API_BASE_URL` 自動推導。
- `backend` 現在支援 `PORT` 與 `BACKEND_PORT`，可直接相容 Zeabur、Render、Railway 與 Docker。
- `backend` 啟動時預設會執行 `prisma migrate deploy`，若不想自動跑 migration，可把 `RUN_MIGRATIONS=false`。
- 本機 `docker-compose.yml` 額外開啟了 `PRISMA_DB_PUSH_FALLBACK=true`，用來兼容先前以 `db push` 建立的舊資料庫；Zeabur 不建議開這個 fallback。

## 常用指令

```bash
npm run build
npm run docker:build
npm run docker:up
npm run docker:down
npm run db:migrate
npm run db:seed
```

# system-081-v1.0
