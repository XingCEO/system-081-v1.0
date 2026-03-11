import 'dotenv/config';
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const frontendBaseUrl = (process.env.UI_TEST_FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const adminBaseUrl = (process.env.UI_TEST_ADMIN_URL || 'http://localhost:3002').replace(/\/$/, '');
const runId = `ui-${Date.now()}`;
const created = {
  menuItemId: null,
  externalCode: null
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function attachErrorTracking(page, label) {
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (error) => {
    pageErrors.push(error.stack || error.message);
  });

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  return () => {
    const significantConsoleErrors = consoleErrors.filter((entry) => !entry.includes('favicon.ico'));
    assert(pageErrors.length === 0, `${label} 發生 pageerror:\n${pageErrors.join('\n\n')}`);
    assert(significantConsoleErrors.length === 0, `${label} 發生 console error:\n${significantConsoleErrors.join('\n\n')}`);
  };
}

async function waitForPageText(page, minLength, label) {
  await page.waitForFunction(
    (expectedLength) => document.body.innerText.trim().length >= expectedLength,
    minLength
  );

  const bodyText = await page.locator('body').innerText();
  assert(bodyText.trim().length >= minLength, `${label} 頁面內容不足，疑似白屏`);
}

async function cleanup() {
  if (created.menuItemId) {
    await prisma.menuItem.deleteMany({
      where: {
        id: created.menuItemId
      }
    });
  }
}

async function main() {
  console.log(`UI verification frontend: ${frontendBaseUrl}`);
  console.log(`UI verification admin: ${adminBaseUrl}`);

  const browser = await chromium.launch({ headless: true });

  try {
    const posContext = await browser.newContext({
      viewport: { width: 1440, height: 960 }
    });
    const posPage = await posContext.newPage();
    const assertPosPageClean = attachErrorTracking(posPage, 'POS');

    await posPage.goto(`${frontendBaseUrl}/pos`, { waitUntil: 'networkidle' });
    await posPage.click('[data-testid="front-login-tab-password"]');
    await posPage.fill('[data-testid="front-login-name-input"]', 'admin');
    await posPage.fill('[data-testid="front-login-password-input"]', 'admin123');
    await posPage.click('[data-testid="front-login-password-submit"]');
    await posPage.waitForSelector('[data-testid="pos-screen"]');
    await waitForPageText(posPage, 50, 'POS');
    assertPosPageClean();

    const kdsPage = await posContext.newPage();
    const assertKdsPageClean = attachErrorTracking(kdsPage, 'KDS');
    await kdsPage.goto(`${frontendBaseUrl}/kds`, { waitUntil: 'networkidle' });
    await waitForPageText(kdsPage, 20, 'KDS');
    assertKdsPageClean();

    const callerPage = await posContext.newPage();
    const assertCallerPageClean = attachErrorTracking(callerPage, 'Caller');
    await callerPage.goto(`${frontendBaseUrl}/caller`, { waitUntil: 'networkidle' });
    await waitForPageText(callerPage, 20, 'Caller');
    assertCallerPageClean();

    const kioskContext = await browser.newContext({
      viewport: { width: 1280, height: 900 }
    });
    const kioskPage = await kioskContext.newPage();
    const assertKioskPageClean = attachErrorTracking(kioskPage, 'Kiosk');
    await kioskPage.goto(`${frontendBaseUrl}/kiosk`, { waitUntil: 'networkidle' });
    await waitForPageText(kioskPage, 20, 'Kiosk');
    assertKioskPageClean();
    await kioskContext.close();

    const qrContext = await browser.newContext({
      viewport: { width: 1280, height: 900 }
    });
    const qrPage = await qrContext.newPage();
    const assertQrPageClean = attachErrorTracking(qrPage, 'QR 點餐');
    await qrPage.goto(`${frontendBaseUrl}/qr?table=01`, { waitUntil: 'networkidle' });
    await waitForPageText(qrPage, 20, 'QR 點餐');
    assertQrPageClean();
    await qrContext.close();

    const adminContext = await browser.newContext({
      viewport: { width: 1440, height: 960 }
    });
    const adminPage = await adminContext.newPage();
    const assertAdminPageClean = attachErrorTracking(adminPage, 'Admin');

    await adminPage.goto(`${adminBaseUrl}/login`, { waitUntil: 'networkidle' });
    await adminPage.fill('[data-testid="admin-login-name-input"]', 'admin');
    await adminPage.fill('[data-testid="admin-login-password-input"]', 'admin123');
    await adminPage.click('[data-testid="admin-login-submit"]');
    await adminPage.waitForSelector('[data-testid="admin-dashboard"]');
    await waitForPageText(adminPage, 40, 'Admin Dashboard');
    assertAdminPageClean();

    await adminPage.goto(`${adminBaseUrl}/menu`, { waitUntil: 'networkidle' });
    await adminPage.waitForSelector('[data-testid="menu-item-name-input"]');

    const categoryValue = await adminPage.locator('[data-testid="menu-item-category-select"] option:not([value=""])').first().getAttribute('value');
    assert(categoryValue, '菜單管理頁找不到可用分類');

    const customName = `UI 驗證餐點 ${runId}`;
    const customExternalCode = `UI-${Date.now()}`;

    await adminPage.fill('[data-testid="menu-item-name-input"]', customName);
    await adminPage.fill('[data-testid="menu-item-external-code-input"]', customExternalCode);
    await adminPage.selectOption('[data-testid="menu-item-category-select"]', categoryValue);
    await adminPage.fill('[data-testid="menu-item-base-price-input"]', '77');
    await adminPage.fill('[data-testid="menu-item-cost-input"]', '28');
    await adminPage.fill('[data-testid="menu-item-stock-input"]', '10');
    await adminPage.click('[data-testid="menu-item-submit-button"]');

    await adminPage.waitForFunction(
      (expectedCode) => document.body.innerText.includes(expectedCode),
      customExternalCode
    );
    assertAdminPageClean();

    const persistedItem = await prisma.menuItem.findUnique({
      where: {
        externalCode: customExternalCode
      }
    });
    assert(persistedItem, '後台建立的自訂餐點沒有寫入資料庫');
    created.menuItemId = persistedItem.id;
    created.externalCode = customExternalCode;

    await posPage.goto(`${frontendBaseUrl}/pos`, { waitUntil: 'networkidle' });
    await posPage.waitForFunction(
      (expectedName) => document.body.innerText.includes(expectedName),
      customName
    );
    assertPosPageClean();

    console.log('UI verification passed.');
  } finally {
    await browser.close();
  }
}

try {
  await main();
} catch (error) {
  console.error('UI verification failed.');
  console.error(error);
  process.exitCode = 1;
} finally {
  await cleanup().catch((cleanupError) => {
    console.error('UI cleanup failed.');
    console.error(cleanupError);
    process.exitCode = 1;
  });
  await prisma.$disconnect();
}
