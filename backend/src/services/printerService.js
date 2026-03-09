const {
  printer: ThermalPrinter,
  types: PrinterTypes,
  CharacterSet,
  BreakLine
} = require('node-thermal-printer');

const prisma = require('../lib/prisma');
const { getSystemSettings } = require('./settingsService');

function formatCurrency(value) {
  return `NT$${Number(value).toFixed(0)}`;
}

async function createPrinter() {
  const { printerSettings } = await getSystemSettings();

  return new ThermalPrinter({
    type: PrinterTypes.EPSON,
    width: 48,
    interface: `tcp://${printerSettings.ip}:${printerSettings.port}`,
    characterSet: CharacterSet.PC852_LATIN2,
    removeSpecialCharacters: false,
    breakLine: BreakLine.WORD,
    options: {
      timeout: 5000
    }
  });
}

async function printReceipt(order) {
  const { storeProfile, pointsRule } = await getSystemSettings();
  const printer = await createPrinter();
  const isConnected = await printer.isPrinterConnected().catch(() => false);

  if (!isConnected) {
    return { printed: false, reason: 'printer_unavailable' };
  }

  printer.alignCenter();
  printer.bold(true);
  printer.setTextDoubleHeight();
  printer.println(storeProfile.name);
  printer.bold(false);
  printer.setTextNormal();
  printer.println(storeProfile.address || '');
  printer.println(storeProfile.phone || '');
  printer.drawLine();
  printer.alignLeft();
  printer.leftRight(`訂單：${order.orderNumber}`, new Date(order.createdAt).toLocaleString('zh-TW'));
  printer.println(`類型：${order.type}`);
  if (order.table?.number) {
    printer.println(`桌號：${order.table.number}`);
  }
  if (order.member?.phone) {
    printer.println(`會員：${order.member.phone}`);
  }
  printer.drawLine();

  order.items.forEach((item) => {
    printer.tableCustom([
      { text: item.menuItem.name, align: 'LEFT', width: 0.55 },
      { text: `x${item.quantity}`, align: 'CENTER', width: 0.15 },
      { text: formatCurrency(item.unitPrice * item.quantity), align: 'RIGHT', width: 0.3 }
    ]);

    const addons = Array.isArray(item.addons) ? item.addons : [];
    if (addons.length > 0) {
      printer.println(`  + ${addons.map((addon) => addon.name).join('、')}`);
    }
    if (item.note) {
      printer.println(`  備註：${item.note}`);
    }
  });

  printer.drawLine();
  printer.leftRight('小計', formatCurrency(order.subtotal));
  if (order.discount > 0) {
    printer.leftRight('折扣', `-${formatCurrency(order.discount)}`);
  }
  printer.leftRight('合計', formatCurrency(order.total));
  if (order.paymentMethod) {
    printer.leftRight('付款方式', order.paymentMethod);
  }
  if (order.receivedAmount > 0) {
    printer.leftRight('收款', formatCurrency(order.receivedAmount));
    printer.leftRight('找零', formatCurrency(order.changeAmount));
  }
  printer.drawLine();
  printer.println(`本次可得點數：${Math.floor(order.total / Number(pointsRule.earnEvery || 30))}`);
  printer.println('謝謝光臨，祝您用餐愉快');
  printer.cut();
  await printer.execute();

  return { printed: true };
}

async function printKitchenTicket(order) {
  const printer = await createPrinter();
  const isConnected = await printer.isPrinterConnected().catch(() => false);

  if (!isConnected) {
    return { printed: false, reason: 'printer_unavailable' };
  }

  printer.alignCenter();
  printer.bold(true);
  printer.setTextQuadArea();
  printer.println(`#${order.orderNumber}`);
  printer.setTextNormal();
  printer.println(order.type === 'DINE_IN' ? '內用' : order.type === 'TAKEOUT' ? '外帶' : '外送');
  if (order.table?.number) {
    printer.println(`桌號 ${order.table.number}`);
  }
  printer.drawLine();
  printer.alignLeft();

  order.items.forEach((item) => {
    printer.bold(true);
    printer.println(`${item.menuItem.name} x${item.quantity}`);
    printer.bold(false);

    const addons = Array.isArray(item.addons) ? item.addons : [];
    if (addons.length > 0) {
      printer.println(`加料：${addons.map((addon) => addon.name).join('、')}`);
    }

    if (item.note) {
      printer.println(`備註：${item.note}`);
    }

    printer.newLine();
  });

  if (order.note) {
    printer.drawLine();
    printer.println(`整單備註：${order.note}`);
  }

  printer.cut();
  await printer.execute();

  return { printed: true };
}

async function reprintOrder(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: Number(orderId) },
    include: {
      table: true,
      member: true,
      items: {
        include: {
          menuItem: true
        }
      }
    }
  });

  if (!order) {
    return { printed: false, reason: 'not_found' };
  }

  const receipt = await printReceipt(order);
  const kitchen = await printKitchenTicket(order);

  return {
    printed: receipt.printed || kitchen.printed,
    receipt,
    kitchen
  };
}

module.exports = {
  printReceipt,
  printKitchenTicket,
  reprintOrder
};
