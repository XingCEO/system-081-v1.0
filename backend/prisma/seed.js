require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const bcrypt = require('bcryptjs');
const { PrismaClient, UserRole, TableStatus, DeliveryPlatform } = require('@prisma/client');

const prisma = new PrismaClient();

const breakfastDiscount = (price) => [
  {
    name: '早餐時段 9 折',
    start: '06:00',
    end: '10:30',
    days: [1, 2, 3, 4, 5, 6, 0],
    price: Number((price * 0.9).toFixed(0))
  }
];

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

async function main() {
  await prisma.refreshToken.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.deliveryOrder.deleteMany();
  await prisma.pointTransaction.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItemAddOnGroup.deleteMany();
  await prisma.addOnOption.deleteMany();
  await prisma.addOnGroup.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.staffAttendance.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.table.deleteMany();
  await prisma.member.deleteMany();
  await prisma.setting.deleteMany();

  const [owner, manager, staff] = await Promise.all([
    upsertUser({ name: 'admin', password: 'admin123', pin: '0000', role: UserRole.OWNER }),
    upsertUser({ name: 'manager', password: 'manager123', pin: '1111', role: UserRole.MANAGER }),
    upsertUser({ name: 'staff01', password: 'staff123', pin: '2222', role: UserRole.STAFF })
  ]);

  const categories = await Promise.all([
    prisma.category.create({ data: { name: '蛋餅類', sortOrder: 1 } }),
    prisma.category.create({ data: { name: '吐司類', sortOrder: 2 } }),
    prisma.category.create({ data: { name: '飲料類', sortOrder: 3 } }),
    prisma.category.create({ data: { name: '套餐', sortOrder: 4 } })
  ]);

  const categoryMap = Object.fromEntries(categories.map((category) => [category.name, category.id]));

  const menuItems = [
    ['蛋餅類', '原味蛋餅', 35, 12, '🥚'],
    ['蛋餅類', '鮪魚蛋餅', 45, 18, '🐟'],
    ['蛋餅類', '起司蛋餅', 40, 15, '🧀'],
    ['蛋餅類', '總匯蛋餅', 55, 22, '🥓'],
    ['吐司類', '厚片吐司', 25, 8, '🍞'],
    ['吐司類', '花生厚片', 30, 10, '🥜'],
    ['吐司類', '總匯三明治', 65, 25, '🥪'],
    ['飲料類', '紅茶', 20, 5, '🫖'],
    ['飲料類', '奶茶', 25, 8, '🥤'],
    ['飲料類', '豆漿', 25, 7, '🫘'],
    ['飲料類', '米漿', 25, 7, '🌾'],
    ['飲料類', '拿鐵', 55, 18, '☕'],
    ['套餐', 'A 套餐（蛋餅+飲料）', 55, 20, '🍱'],
    ['套餐', 'B 套餐（吐司+飲料）', 45, 17, '🥡']
  ];

  const createdItems = [];
  for (const [categoryName, name, basePrice, cost, emoji] of menuItems) {
    const item = await prisma.menuItem.create({
      data: {
        name,
        categoryId: categoryMap[categoryName],
        basePrice,
        cost,
        stock: 30,
        stockAlert: 5,
        isActive: true,
        emoji,
        description: `${name} 早餐店經典人氣餐點`,
        timePricing: breakfastDiscount(basePrice)
      }
    });
    createdItems.push(item);
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
    }
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
    }
  });

  const tempGroup = await prisma.addOnGroup.create({
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
    }
  });

  const savoryItems = createdItems.filter((item) => ['蛋餅類', '吐司類', '套餐'].includes(categories.find((category) => category.id === item.categoryId)?.name));
  const drinkItems = createdItems.filter((item) => categories.find((category) => category.id === item.categoryId)?.name === '飲料類');

  await prisma.menuItemAddOnGroup.createMany({
    data: [
      ...savoryItems.map((item) => ({ menuItemId: item.id, addOnGroupId: extraGroup.id })),
      ...drinkItems.map((item) => ({ menuItemId: item.id, addOnGroupId: sugarGroup.id })),
      ...drinkItems.map((item) => ({ menuItemId: item.id, addOnGroupId: tempGroup.id }))
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
        name: '陳先生',
        phone: '0922333444',
        points: 15,
        totalSpent: 830,
        birthday: new Date('1989-10-20')
      }
    ]
  });

  const tables = Array.from({ length: 10 }).map((_, index) => ({
    number: String(index + 1).padStart(2, '0'),
    capacity: index < 4 ? 2 : 4,
    status: TableStatus.AVAILABLE,
    qrCode: `http://localhost:3000/qr?table=${String(index + 1).padStart(2, '0')}`
  }));

  await prisma.table.createMany({ data: tables });

  await prisma.setting.createMany({
    data: [
      {
        key: 'store_profile',
        value: {
          name: '晨光早餐店',
          address: '台北市中山區早餐路 81 號',
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

  const demoOrder = await prisma.order.create({
    data: {
      orderNumber: '20260310-0001',
      type: 'TAKEOUT',
      status: 'PREPARING',
      subtotal: 115,
      total: 115,
      paymentMethod: 'CASH',
      source: 'pos',
      staffId: staff.id,
      memberId: null,
      note: '少醬油',
      items: {
        create: [
          {
            menuItemId: createdItems.find((item) => item.name === '鮪魚蛋餅').id,
            quantity: 2,
            unitPrice: 45,
            addons: [{ name: '加蛋', price: 10 }],
            note: '切兩份'
          },
          {
            menuItemId: createdItems.find((item) => item.name === '奶茶').id,
            quantity: 1,
            unitPrice: 25,
            addons: [
              { name: '少甜', price: 0 },
              { name: '去冰', price: 0 }
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
      deliveryAddress: '台北市大安區外送路 10 號',
      status: 'PREPARING'
    }
  });

  console.log('Seed 完成');
  console.log('帳號：admin / admin123，PIN 0000');
  console.log('帳號：manager / manager123，PIN 1111');
  console.log('帳號：staff01 / staff123，PIN 2222');
  console.log(`已建立員工 ${owner.name}、${manager.name}、${staff.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
