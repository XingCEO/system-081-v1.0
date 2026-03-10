require('dotenv').config({
  path: require('path').resolve(__dirname, '../../.env')
});

const bcrypt = require('bcryptjs');
const {
  DeliveryPlatform,
  PrismaClient,
  TableStatus,
  UserRole
} = require('@prisma/client');

const prisma = new PrismaClient();

function buildBreakfastPricing(basePrice) {
  return [
    {
      name: '早餐時段 9 折',
      start: '06:00',
      end: '10:30',
      days: [0, 1, 2, 3, 4, 5, 6],
      price: Number((basePrice * 0.9).toFixed(0))
    }
  ];
}

async function upsertUser({ name, password, pin, role }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const pinHash = await bcrypt.hash(pin, 10);

  return prisma.user.upsert({
    where: { name },
    update: {
      role,
      passwordHash,
      pin: pinHash
    },
    create: {
      name,
      role,
      passwordHash,
      pin: pinHash
    }
  });
}

async function createBaseData() {
  await prisma.refreshToken.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.deliveryOrder.deleteMany();
  await prisma.pointTransaction.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.staffAttendance.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.table.deleteMany();
  await prisma.member.deleteMany();
  await prisma.menuItemAddOnGroup.deleteMany();
  await prisma.addOnOption.deleteMany();
  await prisma.addOnGroup.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.setting.deleteMany();

  const users = await Promise.all([
    upsertUser({ name: 'admin', password: 'admin123', pin: '0000', role: UserRole.OWNER }),
    upsertUser({ name: 'manager', password: 'manager123', pin: '1111', role: UserRole.MANAGER }),
    upsertUser({ name: 'staff01', password: 'staff123', pin: '2222', role: UserRole.STAFF })
  ]);

  const categoryRecords = await Promise.all([
    prisma.category.create({ data: { name: '蛋餅類', sortOrder: 1, isActive: true } }),
    prisma.category.create({ data: { name: '吐司類', sortOrder: 2, isActive: true } }),
    prisma.category.create({ data: { name: '飲料類', sortOrder: 3, isActive: true } }),
    prisma.category.create({ data: { name: '套餐', sortOrder: 4, isActive: true } })
  ]);

  const categoryMap = new Map(categoryRecords.map((item) => [item.name, item.id]));

  const productSeed = [
    { category: '蛋餅類', name: '原味蛋餅', externalCode: 'EGG-ORIGINAL', basePrice: 35, cost: 12, emoji: '🥚' },
    { category: '蛋餅類', name: '鮪魚蛋餅', externalCode: 'EGG-TUNA', basePrice: 45, cost: 18, emoji: '🐟' },
    { category: '蛋餅類', name: '起司蛋餅', externalCode: 'EGG-CHEESE', basePrice: 40, cost: 15, emoji: '🧀' },
    { category: '蛋餅類', name: '總匯蛋餅', externalCode: 'EGG-CLUB', basePrice: 55, cost: 22, emoji: '🥪' },
    { category: '吐司類', name: '厚片吐司', externalCode: 'TOAST-THICK', basePrice: 25, cost: 8, emoji: '🍞' },
    { category: '吐司類', name: '花生厚片', externalCode: 'TOAST-PEANUT', basePrice: 30, cost: 10, emoji: '🥜' },
    { category: '吐司類', name: '總匯三明治', externalCode: 'TOAST-CLUB', basePrice: 65, cost: 25, emoji: '🥪' },
    { category: '飲料類', name: '紅茶', externalCode: 'DRINK-BLACKTEA', basePrice: 20, cost: 5, emoji: '🫖' },
    { category: '飲料類', name: '奶茶', externalCode: 'DRINK-MILKTEA', basePrice: 25, cost: 8, emoji: '🥛' },
    { category: '飲料類', name: '豆漿', externalCode: 'DRINK-SOY', basePrice: 25, cost: 7, emoji: '🥤' },
    { category: '飲料類', name: '米漿', externalCode: 'DRINK-RICE', basePrice: 25, cost: 7, emoji: '🧋' },
    { category: '飲料類', name: '拿鐵', externalCode: 'DRINK-LATTE', basePrice: 55, cost: 18, emoji: '☕' }
  ];

  const createdProducts = [];

  for (const product of productSeed) {
    const menuItem = await prisma.menuItem.create({
      data: {
        name: product.name,
        externalCode: product.externalCode,
        categoryId: categoryMap.get(product.category),
        basePrice: product.basePrice,
        cost: product.cost,
        stock: 40,
        stockAlert: 5,
        isActive: true,
        emoji: product.emoji,
        description: `${product.name} 為早餐店經典熱銷品項`,
        timePricing: buildBreakfastPricing(product.basePrice)
      }
    });

    createdProducts.push(menuItem);
  }

  const productMap = new Map(createdProducts.map((item) => [item.name, item]));

  const comboSeed = [
    {
      name: 'A套餐',
      externalCode: 'COMBO-A',
      basePrice: 55,
      cost: 20,
      emoji: '🍱',
      comboConfig: [
        {
          name: '蛋餅任選一',
          required: true,
          maxSelect: 1,
          options: [
            { menuItemId: productMap.get('原味蛋餅').id, name: '原味蛋餅', priceAdjust: 0 },
            { menuItemId: productMap.get('鮪魚蛋餅').id, name: '鮪魚蛋餅', priceAdjust: 5 },
            { menuItemId: productMap.get('起司蛋餅').id, name: '起司蛋餅', priceAdjust: 0 },
            { menuItemId: productMap.get('總匯蛋餅').id, name: '總匯蛋餅', priceAdjust: 10 }
          ]
        },
        {
          name: '飲料任選一',
          required: true,
          maxSelect: 1,
          options: [
            { menuItemId: productMap.get('紅茶').id, name: '紅茶', priceAdjust: 0 },
            { menuItemId: productMap.get('奶茶').id, name: '奶茶', priceAdjust: 0 },
            { menuItemId: productMap.get('豆漿').id, name: '豆漿', priceAdjust: 0 },
            { menuItemId: productMap.get('米漿').id, name: '米漿', priceAdjust: 0 },
            { menuItemId: productMap.get('拿鐵').id, name: '拿鐵', priceAdjust: 20 }
          ]
        }
      ]
    },
    {
      name: 'B套餐',
      externalCode: 'COMBO-B',
      basePrice: 45,
      cost: 17,
      emoji: '🥡',
      comboConfig: [
        {
          name: '吐司任選一',
          required: true,
          maxSelect: 1,
          options: [
            { menuItemId: productMap.get('厚片吐司').id, name: '厚片吐司', priceAdjust: 0 },
            { menuItemId: productMap.get('花生厚片').id, name: '花生厚片', priceAdjust: 0 },
            { menuItemId: productMap.get('總匯三明治').id, name: '總匯三明治', priceAdjust: 15 }
          ]
        },
        {
          name: '飲料任選一',
          required: true,
          maxSelect: 1,
          options: [
            { menuItemId: productMap.get('紅茶').id, name: '紅茶', priceAdjust: 0 },
            { menuItemId: productMap.get('奶茶').id, name: '奶茶', priceAdjust: 0 },
            { menuItemId: productMap.get('豆漿').id, name: '豆漿', priceAdjust: 0 },
            { menuItemId: productMap.get('米漿').id, name: '米漿', priceAdjust: 0 },
            { menuItemId: productMap.get('拿鐵').id, name: '拿鐵', priceAdjust: 20 }
          ]
        }
      ]
    }
  ];

  for (const combo of comboSeed) {
    const comboItem = await prisma.menuItem.create({
      data: {
        name: combo.name,
        externalCode: combo.externalCode,
        categoryId: categoryMap.get('套餐'),
        basePrice: combo.basePrice,
        cost: combo.cost,
        stock: 999,
        stockAlert: 10,
        isActive: true,
        isCombo: true,
        comboConfig: combo.comboConfig,
        emoji: combo.emoji,
        description: `${combo.name} 可自由搭配主餐與飲料`,
        timePricing: buildBreakfastPricing(combo.basePrice)
      }
    });

    productMap.set(combo.name, comboItem);
  }

  const extraGroup = await prisma.addOnGroup.create({
    data: {
      name: '加料',
      required: false,
      maxSelect: 3,
      options: {
        create: [
          { name: '加蛋', price: 10 },
          { name: '加起司', price: 10 },
          { name: '加培根', price: 15 }
        ]
      }
    },
    include: { options: true }
  });

  const sugarGroup = await prisma.addOnGroup.create({
    data: {
      name: '甜度',
      required: true,
      maxSelect: 1,
      options: {
        create: [
          { name: '正常', price: 0 },
          { name: '少甜', price: 0 },
          { name: '半糖', price: 0 },
          { name: '無糖', price: 0 }
        ]
      }
    },
    include: { options: true }
  });

  const temperatureGroup = await prisma.addOnGroup.create({
    data: {
      name: '溫度',
      required: true,
      maxSelect: 1,
      options: {
        create: [
          { name: '熱', price: 0 },
          { name: '溫', price: 0 },
          { name: '冰', price: 0 },
          { name: '去冰', price: 0 }
        ]
      }
    },
    include: { options: true }
  });

  const savoryNames = ['原味蛋餅', '鮪魚蛋餅', '起司蛋餅', '總匯蛋餅', '厚片吐司', '花生厚片', '總匯三明治'];
  const drinkNames = ['紅茶', '奶茶', '豆漿', '米漿', '拿鐵'];

  await prisma.menuItemAddOnGroup.createMany({
    data: [
      ...savoryNames.map((name) => ({
        menuItemId: productMap.get(name).id,
        addOnGroupId: extraGroup.id
      })),
      ...drinkNames.map((name) => ({
        menuItemId: productMap.get(name).id,
        addOnGroupId: sugarGroup.id
      })),
      ...drinkNames.map((name) => ({
        menuItemId: productMap.get(name).id,
        addOnGroupId: temperatureGroup.id
      }))
    ],
    skipDuplicates: true
  });

  await prisma.member.createMany({
    data: [
      {
        name: '王小美',
        phone: '0912345678',
        points: 8,
        totalSpent: 320,
        birthday: new Date('1994-07-08')
      },
      {
        name: '陳志明',
        phone: '0922333444',
        points: 15,
        totalSpent: 830,
        birthday: new Date('1989-10-20')
      }
    ]
  });

  await prisma.table.createMany({
    data: Array.from({ length: 10 }).map((_, index) => ({
      number: String(index + 1).padStart(2, '0'),
      capacity: index < 4 ? 2 : 4,
      status: TableStatus.AVAILABLE,
      qrCode: `http://localhost:3000/qr?table=${String(index + 1).padStart(2, '0')}`
    }))
  });

  await prisma.setting.createMany({
    data: [
      {
        key: 'store_profile',
        value: {
          name: '晨光早餐店',
          address: '台北市中山區晨光路 81 號',
          phone: '02-1234-5678'
        }
      },
      {
        key: 'points_rule',
        value: {
          earnEvery: 30,
          earnPoints: 1,
          redeemRate: 1
        }
      },
      {
        key: 'tax_rule',
        value: {
          enabled: false,
          rate: 0
        }
      },
      {
        key: 'ordering_state',
        value: {
          paused: false
        }
      },
      {
        key: 'notification_settings',
        value: {
          lineNotifyToken: process.env.LINE_NOTIFY_TOKEN || '',
          newOrder: true,
          stockAlert: true,
          pickupReminder: true,
          salesTarget: true,
          dailySalesTarget: Number(process.env.DAILY_SALES_TARGET || 5000)
        }
      },
      {
        key: 'printer_settings',
        value: {
          ip: process.env.PRINTER_IP || '192.168.1.100',
          port: Number(process.env.PRINTER_PORT || 9100),
          width: 80
        }
      }
    ]
  });

  const tables = await prisma.table.findMany({
    orderBy: { number: 'asc' }
  });

  await prisma.reservation.create({
    data: {
      tableId: tables[0].id,
      memberName: '林小姐',
      phone: '0933444555',
      partySize: 2,
      datetime: new Date(Date.now() + (1000 * 60 * 60)),
      note: '靠窗座位',
      status: 'CONFIRMED'
    }
  });

  await prisma.staffAttendance.create({
    data: {
      userId: users[2].id,
      clockIn: new Date(Date.now() - (1000 * 60 * 90))
    }
  });

  const demoOrder = await prisma.order.create({
    data: {
      orderNumber: '20260310-0001',
      type: 'TAKEOUT',
      status: 'PREPARING',
      subtotal: 115,
      total: 115,
      paymentMethod: 'CASH',
      source: 'pos',
      staffId: users[2].id,
      note: '少冰少糖',
      items: {
        create: [
          {
            menuItemId: productMap.get('鮪魚蛋餅').id,
            quantity: 2,
            unitPrice: 45,
            addons: [{ kind: 'addon', name: '加蛋', price: 10 }],
            note: '切半'
          },
          {
            menuItemId: productMap.get('奶茶').id,
            quantity: 1,
            unitPrice: 25,
            addons: [
              { kind: 'addon', name: '少甜', price: 0 },
              { kind: 'addon', name: '去冰', price: 0 }
            ]
          }
        ]
      }
    }
  });

  await prisma.deliveryOrder.create({
    data: {
      orderId: demoOrder.id,
      platform: DeliveryPlatform.PHONE,
      externalId: 'phone-demo-001',
      deliveryAddress: '台北市中山區民生東路 10 號',
      status: 'PREPARING'
    }
  });

  await prisma.notification.createMany({
    data: [
      {
        type: 'NEW_ORDER',
        message: '新訂單 #20260310-0001 已送至廚房。'
      },
      {
        type: 'STOCK_ALERT',
        message: '鮪魚蛋餅庫存接近警戒值，請留意備料。'
      }
    ]
  });

  return users;
}

async function main() {
  await createBaseData();

  console.log('Seed 完成。');
  console.log('登入帳號：admin / admin123，PIN 0000');
  console.log('登入帳號：manager / manager123，PIN 1111');
  console.log('登入帳號：staff01 / staff123，PIN 2222');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
