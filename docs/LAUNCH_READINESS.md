# Breakfast POS Launch Readiness

## 1. UI/UX 設計基準

### 1.1 視覺方向
- 風格：明亮、乾淨、可在早餐店高頻操作情境下快速辨識
- 主色：`#2563EB`
- 背景：`#F8FAFC`
- 文字主色：`#0F172A`
- 輔助色：
  - 成功：`#16A34A`
  - 警示：`#F59E0B`
  - 危險：`#EF4444`

### 1.2 字體與資訊層級
- 中文字體：`Noto Sans TC`
- 數字與金額：`JetBrains Mono`
- 標題使用粗體與較大字級，提升站點、訂單號、金額的可掃描性
- 表單與按鈕標籤維持同一節奏，避免收銀現場判讀成本

### 1.3 版面規則
- POS：左側菜單、右側購物車與訂單快覽，將主要操作聚焦在單一視線動線
- Admin：左側固定導航、右側內容工作區，維持管理系統一致性
- Kiosk / QR：大按鈕、大字體、最少一步驟完成點餐
- 所有頁面皆採卡片式白底面板，並以圓角、陰影、淡藍漸層背景建立一致品牌感

### 1.4 按鈕層級
- Primary：藍底白字，用於登入、建立訂單、儲存設定、送出表單
- Secondary：白底灰框，用於切換、返回、次要操作
- Danger：紅色警示底，僅用於刪除、停用、取消等高風險動作
- Disabled：保留按鈕位置但降低對比，避免版面跳動

### 1.5 互動回饋
- 成功：Toast 或成功確認視窗，並顯示訂單號 / 結果摘要
- 載入中：骨架畫面或明確的文字提示
- 錯誤：卡片式錯誤訊息，避免整頁空白
- 關鍵流程：
  - POS 下單完成後以成功視窗收斂操作，避免使用者不確定是否送單成功
  - 菜單 / 訂單快覽資料載入失敗時顯示可理解的錯誤內容，不顯示白屏

### 1.6 RWD 目標
- 桌機：完整雙欄或三欄資訊密度
- iPad：保持核心操作按鈕可直接點擊，不依賴 hover
- 小平板 / 直向：內容改為上下堆疊，保留主流程優先

## 2. 功能驗證範圍

本次驗證涵蓋以下模組：

- 認證：帳密登入、PIN 登入、Refresh Token、Logout、`/auth/me`
- 菜單：分類、品項、加料、可售狀態、匯入、匯出
- 訂單：建立、查詢、狀態流轉
- 會員：建立、查詢、點數異動
- 員工：建立、打卡、出勤查詢
- 桌位與預約：建立桌位、建立訂位、完成訂位
- 外送：foodpanda Webhook 建單、外送單狀態更新
- 通知：通知列表與已讀
- 報表：Dashboard、日 / 週 / 月、熱銷商品、高峰時段、毛利、Excel / PDF 匯出
- 設定與備份：設定更新、備份匯出
- UI：POS、KDS、Caller、Kiosk、QR、Admin Dashboard、Admin Menu

## 3. 自動化驗證命令

```bash
npm run test:smoke
npm run test:system
npm run test:ui
npm run qa:full
```

### `test:smoke`
- 快速確認核心 API 與基本流程可運作

### `test:system`
- 以 API 實際建立測試資料並驗證：
  - 自訂菜單可建立
  - 自訂菜單可經 API 讀回
  - 自訂菜單可在資料庫中查到
  - 訂單、會員、員工、桌位、預約、外送、報表、通知、設定、備份皆可正常運作

### `test:ui`
- 以 Playwright 實際打開 UI：
  - POS 登入與載入
  - KDS / Caller / Kiosk / QR 頁面載入
  - Admin 登入與 Dashboard
  - Admin 菜單管理建立自訂菜單
  - POS 再次顯示剛建立的自訂菜單

## 4. 上線前檢查清單

- Docker 服務可正常啟動
- PostgreSQL migration 已部署
- Seed 帳號與正式帳號已區分
- `JWT_SECRET`、Webhook Secret、LINE Token 已改為正式值
- Zeabur Persistent Storage 已掛到 backend uploads
- 前後台網域已加入 backend CORS 白名單
- 熱感列印機 IP / Port 已設定
- 每日營收目標、點數規則、稅率已確認
- 管理後台 OWNER 帳號已更換密碼與 PIN
- 完整 QA 指令執行通過

## 5. 目前可直接交付的標準

- 三端可本機與 Docker 啟動
- 後端主要模組有自動化驗證
- UI 主要模組有自動化驗證
- 自訂菜單建立可回寫資料庫並由 POS 顯示
- 匯入 / 匯出、備份 / 報表匯出可執行
- 關鍵頁面具備 loading / error 呈現，避免空白頁
