# 早餐店完整 POS 系統

這是一個可本機執行、可 Docker 化、可部署到 Zeabur 的早餐店 POS monorepo，包含：

- `backend`：Node.js + Express + Prisma + Socket.IO
- `frontend`：POS / Kiosk / QR 點餐 / KDS / 叫號屏
- `admin`：後台管理系統

目前已完成的核心能力：

- JWT + PIN 登入
- 菜單分類、加料、時段定價、套餐組合
- POS 點餐、結帳、點數折抵、成功出單提示
- Kiosk / QR 自助點餐與 60 秒閒置回首頁
- KDS 即時接單、開始製作、完成叫號
- 叫號螢幕即時顯示與音效
- 後台菜單匯入匯出、圖片上傳、備份還原、通知中心
- 外送 Webhook 接收、SKU / externalCode 對應
- Excel / PDF 報表匯出
- Docker / Zeabur 部署配置

## 專案結構

```text
backend/   Express + Prisma + Socket.IO API
frontend/  POS / Kiosk / QR / KDS / Caller
admin/     後台管理
docs/      部署文件
scripts/   驗證腳本
```

## 技術棧

- Frontend：React 18、Vite、TailwindCSS、Zustand、React Query
- Backend：Node.js、Express、Prisma、Socket.IO
- Database：PostgreSQL
- Auth：JWT、bcryptjs
- Export：exceljs、pdfkit
- Print：node-thermal-printer
- Notify：LINE Notify

## 本機啟動

1. 安裝依賴

```bash
npm install
```

2. 啟動 PostgreSQL

```bash
docker compose up -d postgres
```

3. 套用 migration 與 seed

```bash
npm run db:migrate
npm run db:seed
```

4. 啟動三個服務

```bash
npm run dev
```

啟動後位址：

- 前台：`http://localhost:3000`
- 後端：`http://localhost:3001`
- 後台：`http://localhost:3002`

## 測試與驗證

建置全部服務：

```bash
npm run build
```

執行 smoke test：

```bash
npm run test:smoke
```

smoke test 會驗證：

- 管理員登入
- 菜單 availability
- 會員查詢
- 建立訂單
- 訂單狀態流轉
- 菜單匯出
- 系統備份
- 通知列表

## 預設帳號

- `admin / admin123`，PIN `0000`
- `manager / manager123`，PIN `1111`
- `staff01 / staff123`，PIN `2222`

## 重要腳本

```bash
npm run dev
npm run build
npm run test:smoke
npm run docker:build
npm run docker:up
npm run docker:down
npm run db:migrate
npm run db:seed
```

## 環境變數

請參考：

- [/.env.example](C:\Users\White CEO\Downloads\081-system最終版\.env.example)
- [/backend/.env.example](C:\Users\White CEO\Downloads\081-system最終版\backend\.env.example)
- [/frontend/.env.example](C:\Users\White CEO\Downloads\081-system最終版\frontend\.env.example)
- [/admin/.env.example](C:\Users\White CEO\Downloads\081-system最終版\admin\.env.example)

本機預設 PostgreSQL 使用 `127.0.0.1:5433`，避免與你本機既有的 `5432` 衝突。

## Docker

完整啟動：

```bash
npm run docker:up
```

關閉：

```bash
npm run docker:down
```

若需要清除資料卷：

```bash
docker compose down -v
```

## Zeabur

Zeabur 部署步驟請看：

- [docs/ZEABUR_DEPLOY.md](C:\Users\White CEO\Downloads\081-system最終版\docs\ZEABUR_DEPLOY.md)

建議拆成四個服務：

- PostgreSQL
- Backend
- Frontend
- Admin

## 補充

- 圖片上傳會存到 `backend/uploads`
- 後台可匯出完整系統備份並還原
- 菜單可匯入 / 匯出 JSON，資料會留存
- 套餐商品使用 `comboConfig` 管理可選主餐與飲料

# system-081-v1.0
