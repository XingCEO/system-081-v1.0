// 資料庫種子資料
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 開始建立種子資料...');

  // ==================== 使用者 ====================
  const adminPin = await bcrypt.hash('0000', 10);
  const managerPin = await bcrypt.hash('1111', 10);
  const cashierPin = await bcrypt.hash('2222', 10);
  const kitchenPin = await bcrypt.hash('3333', 10);

  const admin = await prisma.user.create({
    data: { name: '管理員', pin: adminPin, role: 'admin' }
  });
  const manager = await prisma.user.create({
    data: { name: '店長', pin: managerPin, role: 'manager' }
  });
  await prisma.user.create({
    data: { name: '收銀員 A', pin: cashierPin, role: 'cashier' }
  });
  await prisma.user.create({
    data: { name: '廚房人員', pin: kitchenPin, role: 'kitchen' }
  });

  console.log('✅ 使用者建立完成');

  // ==================== 菜單分類 ====================
  const categories = await Promise.all([
    prisma.category.create({ data: { name: '主餐', icon: '🍖', color: '#E74C3C', sortOrder: 1 } }),
    prisma.category.create({ data: { name: '麵食', icon: '🍜', color: '#F39C12', sortOrder: 2 } }),
    prisma.category.create({ data: { name: '飯類', icon: '🍚', color: '#27AE60', sortOrder: 3 } }),
    prisma.category.create({ data: { name: '小菜', icon: '🥗', color: '#3498DB', sortOrder: 4 } }),
    prisma.category.create({ data: { name: '湯品', icon: '🍲', color: '#9B59B6', sortOrder: 5 } }),
    prisma.category.create({ data: { name: '飲料', icon: '🥤', color: '#1ABC9C', sortOrder: 6 } }),
    prisma.category.create({ data: { name: '甜點', icon: '🍰', color: '#E91E63', sortOrder: 7 } }),
    prisma.category.create({ data: { name: '套餐', icon: '🍱', color: '#FF5722', sortOrder: 8 } }),
  ]);

  console.log('✅ 菜單分類建立完成');

  // ==================== 菜單品項 ====================
  // 主餐
  const steak = await prisma.menuItem.create({
    data: {
      categoryId: categories[0].id, name: '碳烤牛排', basePrice: 380, cost: 150,
      description: '嚴選澳洲牛肉，炭火直烤', preparationTime: 15, isFeatured: true, sortOrder: 1
    }
  });
  await prisma.menuItem.create({
    data: {
      categoryId: categories[0].id, name: '香煎雞腿排', basePrice: 280, cost: 90,
      description: '去骨雞腿排，外酥內嫩', preparationTime: 12, isFeatured: true, sortOrder: 2
    }
  });
  await prisma.menuItem.create({
    data: {
      categoryId: categories[0].id, name: '日式豬排', basePrice: 260, cost: 80,
      description: '厚切里肌豬排，酥炸金黃', preparationTime: 10, sortOrder: 3
    }
  });
  await prisma.menuItem.create({
    data: {
      categoryId: categories[0].id, name: '鹽烤鯖魚', basePrice: 240, cost: 85,
      description: '挪威鯖魚，鹽烤原味', preparationTime: 12, sortOrder: 4
    }
  });

  // 麵食
  await prisma.menuItem.create({
    data: {
      categoryId: categories[1].id, name: '紅燒牛肉麵', basePrice: 180, cost: 60,
      description: '慢燉牛腩，濃郁湯頭', preparationTime: 8, isFeatured: true, sortOrder: 1
    }
  });
  await prisma.menuItem.create({
    data: {
      categoryId: categories[1].id, name: '擔仔麵', basePrice: 120, cost: 35,
      description: '台南古早味', preparationTime: 5, sortOrder: 2
    }
  });
  await prisma.menuItem.create({
    data: {
      categoryId: categories[1].id, name: '炒烏龍麵', basePrice: 150, cost: 45,
      description: '日式醬油炒烏龍', preparationTime: 8, sortOrder: 3
    }
  });
  await prisma.menuItem.create({
    data: {
      categoryId: categories[1].id, name: '海鮮義大利麵', basePrice: 220, cost: 75,
      description: '白酒蛤蜊義大利麵', preparationTime: 12, sortOrder: 4
    }
  });

  // 飯類
  await prisma.menuItem.create({
    data: {
      categoryId: categories[2].id, name: '滷肉飯', basePrice: 60, cost: 15,
      description: '古早味手工滷肉', preparationTime: 3, isFeatured: true, sortOrder: 1
    }
  });
  await prisma.menuItem.create({
    data: {
      categoryId: categories[2].id, name: '雞腿便當', basePrice: 120, cost: 40,
      description: '附三樣配菜及湯', preparationTime: 5, sortOrder: 2
    }
  });
  await prisma.menuItem.create({
    data: {
      categoryId: categories[2].id, name: '咖哩飯', basePrice: 140, cost: 40,
      description: '日式咖哩，附福神漬', preparationTime: 5, sortOrder: 3
    }
  });

  // 小菜
  await prisma.menuItem.create({
    data: {
      categoryId: categories[3].id, name: '涼拌小黃瓜', basePrice: 50, cost: 10,
      preparationTime: 2, sortOrder: 1
    }
  });
  await prisma.menuItem.create({
    data: {
      categoryId: categories[3].id, name: '皮蛋豆腐', basePrice: 60, cost: 15,
      preparationTime: 3, sortOrder: 2
    }
  });
  await prisma.menuItem.create({
    data: {
      categoryId: categories[3].id, name: '炒青菜', basePrice: 80, cost: 20,
      description: '當季時蔬', preparationTime: 5, sortOrder: 3
    }
  });
  await prisma.menuItem.create({
    data: {
      categoryId: categories[3].id, name: '滷味拼盤', basePrice: 120, cost: 40,
      preparationTime: 3, sortOrder: 4
    }
  });

  // 湯品
  await prisma.menuItem.create({
    data: {
      categoryId: categories[4].id, name: '味噌湯', basePrice: 40, cost: 8,
      preparationTime: 2, sortOrder: 1
    }
  });
  await prisma.menuItem.create({
    data: {
      categoryId: categories[4].id, name: '玉米濃湯', basePrice: 60, cost: 15,
      preparationTime: 3, sortOrder: 2
    }
  });
  await prisma.menuItem.create({
    data: {
      categoryId: categories[4].id, name: '酸辣湯', basePrice: 70, cost: 20,
      preparationTime: 5, sortOrder: 3
    }
  });

  // 飲料
  const blackTea = await prisma.menuItem.create({
    data: {
      categoryId: categories[5].id, name: '紅茶', basePrice: 30, cost: 5,
      preparationTime: 1, sortOrder: 1
    }
  });
  const greenTea = await prisma.menuItem.create({
    data: {
      categoryId: categories[5].id, name: '綠茶', basePrice: 30, cost: 5,
      preparationTime: 1, sortOrder: 2
    }
  });
  await prisma.menuItem.create({
    data: {
      categoryId: categories[5].id, name: '奶茶', basePrice: 50, cost: 10,
      preparationTime: 2, sortOrder: 3
    }
  });
  await prisma.menuItem.create({
    data: {
      categoryId: categories[5].id, name: '美式咖啡', basePrice: 60, cost: 15,
      preparationTime: 3, sortOrder: 4
    }
  });
  await prisma.menuItem.create({
    data: {
      categoryId: categories[5].id, name: '拿鐵', basePrice: 80, cost: 20,
      preparationTime: 3, sortOrder: 5
    }
  });
  await prisma.menuItem.create({
    data: {
      categoryId: categories[5].id, name: '柳橙汁', basePrice: 70, cost: 20,
      description: '現榨柳橙汁', preparationTime: 3, sortOrder: 6
    }
  });

  // 甜點
  await prisma.menuItem.create({
    data: {
      categoryId: categories[6].id, name: '提拉米蘇', basePrice: 120, cost: 35,
      preparationTime: 2, sortOrder: 1
    }
  });
  await prisma.menuItem.create({
    data: {
      categoryId: categories[6].id, name: '巧克力蛋糕', basePrice: 100, cost: 30,
      preparationTime: 2, sortOrder: 2
    }
  });
  await prisma.menuItem.create({
    data: {
      categoryId: categories[6].id, name: '冰淇淋', basePrice: 80, cost: 20,
      description: '香草/巧克力/草莓', preparationTime: 2, sortOrder: 3
    }
  });

  console.log('✅ 菜單品項建立完成');

  // ==================== 選項 ====================
  // 牛排熟度
  await prisma.menuOption.create({
    data: {
      menuItemId: steak.id, name: '熟度', type: 'single', isRequired: true, sortOrder: 0,
      choices: {
        create: [
          { name: '三分熟', sortOrder: 0 },
          { name: '五分熟', sortOrder: 1, isDefault: true },
          { name: '七分熟', sortOrder: 2 },
          { name: '全熟', sortOrder: 3 }
        ]
      }
    }
  });

  // 飲料冰量
  for (const item of [blackTea, greenTea]) {
    await prisma.menuOption.create({
      data: {
        menuItemId: item.id, name: '冰量', type: 'single', isRequired: true, sortOrder: 0,
        choices: {
          create: [
            { name: '正常冰', sortOrder: 0, isDefault: true },
            { name: '少冰', sortOrder: 1 },
            { name: '微冰', sortOrder: 2 },
            { name: '去冰', sortOrder: 3 },
            { name: '熱飲', sortOrder: 4 }
          ]
        }
      }
    });
    await prisma.menuOption.create({
      data: {
        menuItemId: item.id, name: '甜度', type: 'single', isRequired: true, sortOrder: 1,
        choices: {
          create: [
            { name: '全糖', sortOrder: 0 },
            { name: '七分糖', sortOrder: 1, isDefault: true },
            { name: '半糖', sortOrder: 2 },
            { name: '三分糖', sortOrder: 3 },
            { name: '無糖', sortOrder: 4 }
          ]
        }
      }
    });
    await prisma.menuOption.create({
      data: {
        menuItemId: item.id, name: '加料', type: 'multiple', isRequired: false, maxSelect: 3, sortOrder: 2,
        choices: {
          create: [
            { name: '珍珠', priceAdjust: 10, sortOrder: 0 },
            { name: '椰果', priceAdjust: 10, sortOrder: 1 },
            { name: '仙草', priceAdjust: 10, sortOrder: 2 },
            { name: '布丁', priceAdjust: 15, sortOrder: 3 }
          ]
        }
      }
    });
  }

  console.log('✅ 菜單選項建立完成');

  // ==================== 時段定價 ====================
  // 滷肉飯午餐特價
  await prisma.menuItemTimePrice.create({
    data: {
      menuItemId: 9, name: '午餐特價', price: 50,
      startTime: '11:00', endTime: '14:00',
      daysOfWeek: '[1,2,3,4,5]'
    }
  });

  console.log('✅ 時段定價建立完成');

  // ==================== 桌位 ====================
  const tableData = [];
  for (let i = 1; i <= 12; i++) {
    tableData.push({
      number: `A${String(i).padStart(2, '0')}`,
      name: `A區 ${i}號桌`,
      capacity: i <= 4 ? 2 : i <= 8 ? 4 : 6,
      zone: 'A區',
      sortOrder: i
    });
  }
  for (let i = 1; i <= 6; i++) {
    tableData.push({
      number: `B${String(i).padStart(2, '0')}`,
      name: `B區 ${i}號桌`,
      capacity: i <= 3 ? 4 : 8,
      zone: 'B區',
      sortOrder: 12 + i
    });
  }
  await prisma.table.createMany({ data: tableData });

  console.log('✅ 桌位建立完成');

  // ==================== 系統設定 ====================
  const settings = [
    { key: 'store_name', value: '"081 餐飲"', group: 'general', description: '店家名稱' },
    { key: 'store_phone', value: '"02-1234-5678"', group: 'general', description: '店家電話' },
    { key: 'store_address', value: '"台北市信義區信義路五段7號"', group: 'general', description: '店家地址' },
    { key: 'tax_rate', value: '0.05', group: 'tax', description: '營業稅率' },
    { key: 'tax_included', value: 'true', group: 'tax', description: '售價是否含稅' },
    { key: 'receipt_header', value: '"歡迎光臨 081 餐飲"', group: 'receipt', description: '收據表頭' },
    { key: 'receipt_footer', value: '"感謝您的光臨，歡迎再來！"', group: 'receipt', description: '收據表尾' },
    { key: 'order_number_prefix', value: '"A"', group: 'general', description: '訂單編號前綴' },
    { key: 'currency', value: '"TWD"', group: 'general', description: '幣別' },
    { key: 'business_hours', value: '{"open":"10:00","close":"22:00"}', group: 'general', description: '營業時間' },
    { key: 'points_per_dollar', value: '1', group: 'member', description: '每消費幾元得1點' },
    { key: 'points_dollar_value', value: '100', group: 'member', description: '每消費幾元得1點的金額' },
  ];

  for (const s of settings) {
    await prisma.setting.create({ data: s });
  }

  console.log('✅ 系統設定建立完成');

  // ==================== 範例會員 ====================
  await prisma.member.createMany({
    data: [
      { phone: '0912345678', name: '王小明', gender: 'male', points: 150, totalSpent: 3200, visitCount: 12, level: 'gold' },
      { phone: '0923456789', name: '李小華', gender: 'female', points: 80, totalSpent: 1500, visitCount: 6, level: 'silver' },
      { phone: '0934567890', name: '張大衛', gender: 'male', points: 30, totalSpent: 600, visitCount: 3 },
    ]
  });

  console.log('✅ 範例會員建立完成');
  console.log('');
  console.log('🎉 種子資料建立完成！');
  console.log('');
  console.log('📋 預設帳號 PIN 碼：');
  console.log('   管理員: 0000');
  console.log('   店長:   1111');
  console.log('   收銀員: 2222');
  console.log('   廚房:   3333');
}

main()
  .catch((e) => {
    console.error('❌ 種子資料建立失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
