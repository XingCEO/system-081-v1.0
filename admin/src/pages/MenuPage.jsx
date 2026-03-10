import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { resolveAssetUrl } from '../lib/runtimeConfig';

function resolveImageUrl(imageUrl) {
  return resolveAssetUrl(imageUrl);
}

function defaultCategoryForm() {
  return { id: null, name: '', sortOrder: 1, isActive: true };
}

function defaultItemForm() {
  return {
    id: null,
    name: '',
    externalCode: '',
    categoryId: '',
    basePrice: '',
    cost: '',
    stock: 20,
    stockAlert: 5,
    emoji: '🍳',
    description: '',
    imageUrl: '',
    isActive: true,
    isCombo: false,
    addOnGroupIds: [],
    timePricingText: JSON.stringify(
      [{ name: '早餐時段 9 折', start: '06:00', end: '10:30', days: [0, 1, 2, 3, 4, 5, 6], price: 0 }],
      null,
      2
    ),
    comboConfigText: '[]'
  };
}

function defaultAddonForm() {
  return {
    id: null,
    name: '',
    required: false,
    maxSelect: 1,
    options: [{ name: '', price: 0 }]
  };
}

function parseJsonText(text, fieldName) {
  if (!text.trim()) {
    return [];
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${fieldName} 格式不是合法 JSON`);
  }
}

function buildItemPayload(itemForm) {
  const basePrice = Number(itemForm.basePrice || 0);
  const timePricing = parseJsonText(itemForm.timePricingText, '時段定價').map((entry) => ({
    ...entry,
    price: Number(entry.price || basePrice)
  }));
  const comboConfig = parseJsonText(itemForm.comboConfigText, '套餐設定');

  return {
    ...itemForm,
    categoryId: Number(itemForm.categoryId),
    basePrice,
    cost: Number(itemForm.cost || 0),
    stock: Number(itemForm.stock || 0),
    stockAlert: Number(itemForm.stockAlert || 5),
    isCombo: Boolean(itemForm.isCombo),
    timePricing,
    comboConfig
  };
}

function normalizeAddonForm(group) {
  return {
    id: group.id,
    name: group.name,
    required: group.required,
    maxSelect: group.maxSelect,
    options: (group.options || []).map((option) => ({
      name: option.name,
      price: Number(option.price || 0)
    }))
  };
}

export default function MenuPage() {
  const queryClient = useQueryClient();
  const [categoryForm, setCategoryForm] = useState(defaultCategoryForm());
  const [itemForm, setItemForm] = useState(defaultItemForm());
  const [addonForm, setAddonForm] = useState(defaultAddonForm());
  const [importPayload, setImportPayload] = useState('');
  const [replaceAll, setReplaceAll] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ['admin-menu-categories'],
    queryFn: () => api.get('/menu/categories')
  });

  const itemsQuery = useQuery({
    queryKey: ['admin-menu-items'],
    queryFn: () => api.get('/menu/items?all=true')
  });

  const addonsQuery = useQuery({
    queryKey: ['admin-menu-addons'],
    queryFn: () => api.get('/menu/addons')
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-menu-categories'] });
    queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] });
    queryClient.invalidateQueries({ queryKey: ['admin-menu-addons'] });
  };

  const categoryMutation = useMutation({
    mutationFn: (payload) => (
      payload.id
        ? api.put(`/menu/categories/${payload.id}`, payload)
        : api.post('/menu/categories', payload)
    ),
    onSuccess: () => {
      toast.success('分類已儲存');
      setCategoryForm(defaultCategoryForm());
      refreshAll();
    },
    onError: (error) => toast.error(error.message || '分類儲存失敗')
  });

  const itemMutation = useMutation({
    mutationFn: (payload) => (
      payload.id
        ? api.put(`/menu/items/${payload.id}`, payload)
        : api.post('/menu/items', payload)
    ),
    onSuccess: () => {
      toast.success('品項已儲存');
      setItemForm(defaultItemForm());
      refreshAll();
    },
    onError: (error) => toast.error(error.message || '品項儲存失敗')
  });

  const addonMutation = useMutation({
    mutationFn: (payload) => (
      payload.id
        ? api.put(`/menu/addons/${payload.id}`, payload)
        : api.post('/menu/addons', payload)
    ),
    onSuccess: () => {
      toast.success('加料群組已儲存');
      setAddonForm(defaultAddonForm());
      refreshAll();
    },
    onError: (error) => toast.error(error.message || '加料群組儲存失敗')
  });

  const toggleItemMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/menu/items/${id}`, { isActive }),
    onSuccess: () => refreshAll(),
    onError: (error) => toast.error(error.message || '更新上下架狀態失敗')
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('image', file);
      return api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    },
    onSuccess: (data) => {
      setItemForm((current) => ({
        ...current,
        imageUrl: data.url
      }));
      toast.success('圖片上傳成功');
    },
    onError: (error) => toast.error(error.message || '圖片上傳失敗')
  });

  const exportMutation = useMutation({
    mutationFn: () => api.get('/menu/export'),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `menu-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('菜單匯出完成');
    },
    onError: (error) => toast.error(error.message || '菜單匯出失敗')
  });

  const importMutation = useMutation({
    mutationFn: (payload) => api.post('/menu/import', payload),
    onSuccess: () => {
      toast.success('菜單匯入完成');
      setImportPayload('');
      refreshAll();
    },
    onError: (error) => toast.error(error.message || '菜單匯入失敗')
  });

  const categories = categoriesQuery.data || [];
  const items = itemsQuery.data || [];
  const addons = addonsQuery.data || [];
  const categoryNameMap = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);

  const submitItem = () => {
    try {
      const payload = buildItemPayload(itemForm);
      itemMutation.mutate(payload);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="admin-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">分類管理</h2>
            <button type="button" className="admin-ghost" onClick={() => setCategoryForm(defaultCategoryForm())}>
              新增分類
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            <input
              className="admin-field"
              placeholder="分類名稱"
              value={categoryForm.name}
              onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
            />
            <input
              className="admin-field"
              type="number"
              placeholder="排序"
              value={categoryForm.sortOrder}
              onChange={(event) => setCategoryForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))}
            />
            <label className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
              <input
                checked={categoryForm.isActive}
                onChange={(event) => setCategoryForm((current) => ({ ...current, isActive: event.target.checked }))}
                type="checkbox"
              /> 啟用分類
            </label>
            <button type="button" className="admin-button" onClick={() => categoryMutation.mutate(categoryForm)}>
              儲存分類
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {categories.map((category) => (
              <div key={category.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{category.name}</div>
                    <div className="mt-1 text-sm text-slate-500">排序 {category.sortOrder} / {category.itemCount} 項</div>
                  </div>
                  <button type="button" className="admin-ghost" onClick={() => setCategoryForm(category)}>
                    編輯
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">品項管理</h2>
              <p className="mt-1 text-sm text-slate-500">支援商品編號、時段定價、圖片上傳與套餐組合 JSON 設定。</p>
            </div>
            <button type="button" className="admin-ghost" onClick={() => setItemForm(defaultItemForm())}>
              新增品項
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              className="admin-field"
              placeholder="品項名稱"
              value={itemForm.name}
              onChange={(event) => setItemForm((current) => ({ ...current, name: event.target.value }))}
            />
            <input
              className="admin-field"
              placeholder="外部商品編號 / SKU"
              value={itemForm.externalCode}
              onChange={(event) => setItemForm((current) => ({ ...current, externalCode: event.target.value }))}
            />
            <select
              className="admin-field"
              value={itemForm.categoryId}
              onChange={(event) => setItemForm((current) => ({ ...current, categoryId: event.target.value }))}
            >
              <option value="">請選擇分類</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <input
              className="admin-field"
              type="number"
              placeholder="售價"
              value={itemForm.basePrice}
              onChange={(event) => setItemForm((current) => ({ ...current, basePrice: event.target.value }))}
            />
            <input
              className="admin-field"
              type="number"
              placeholder="成本"
              value={itemForm.cost}
              onChange={(event) => setItemForm((current) => ({ ...current, cost: event.target.value }))}
            />
            <input
              className="admin-field"
              type="number"
              placeholder="庫存"
              value={itemForm.stock}
              onChange={(event) => setItemForm((current) => ({ ...current, stock: event.target.value }))}
            />
            <input
              className="admin-field"
              type="number"
              placeholder="庫存警戒值"
              value={itemForm.stockAlert}
              onChange={(event) => setItemForm((current) => ({ ...current, stockAlert: event.target.value }))}
            />
            <input
              className="admin-field"
              placeholder="Emoji"
              value={itemForm.emoji}
              onChange={(event) => setItemForm((current) => ({ ...current, emoji: event.target.value }))}
            />
            <input
              className="admin-field md:col-span-2"
              placeholder="圖片網址"
              value={itemForm.imageUrl}
              onChange={(event) => setItemForm((current) => ({ ...current, imageUrl: event.target.value }))}
            />
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">上傳圖片</label>
              <input
                className="admin-field"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    uploadMutation.mutate(file);
                  }
                }}
              />
            </div>
            {itemForm.imageUrl && (
              <div className="md:col-span-2 rounded-2xl border border-slate-200 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">圖片預覽</p>
                <img
                  src={resolveImageUrl(itemForm.imageUrl)}
                  alt={itemForm.name || 'menu item'}
                  className="h-40 w-full rounded-2xl object-cover"
                />
              </div>
            )}
            <textarea
              className="admin-field min-h-24 resize-none md:col-span-2"
              placeholder="品項描述"
              value={itemForm.description}
              onChange={(event) => setItemForm((current) => ({ ...current, description: event.target.value }))}
            />
            <label className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
              <input
                checked={itemForm.isActive}
                onChange={(event) => setItemForm((current) => ({ ...current, isActive: event.target.checked }))}
                type="checkbox"
              /> 上架中
            </label>
            <label className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
              <input
                checked={itemForm.isCombo}
                onChange={(event) => setItemForm((current) => ({ ...current, isCombo: event.target.checked }))}
                type="checkbox"
              /> 套餐商品
            </label>
            <textarea
              className="admin-field min-h-36 resize-none md:col-span-2"
              placeholder="時段定價 JSON"
              value={itemForm.timePricingText}
              onChange={(event) => setItemForm((current) => ({ ...current, timePricingText: event.target.value }))}
            />
            <textarea
              className="admin-field min-h-40 resize-none md:col-span-2"
              placeholder="套餐設定 JSON"
              value={itemForm.comboConfigText}
              onChange={(event) => setItemForm((current) => ({ ...current, comboConfigText: event.target.value }))}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 p-4">
            <div className="text-sm font-semibold text-slate-700">可用加料群組</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {addons.map((group) => (
                <label key={group.id} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={itemForm.addOnGroupIds.includes(group.id)}
                    onChange={(event) => setItemForm((current) => ({
                      ...current,
                      addOnGroupIds: event.target.checked
                        ? [...current.addOnGroupIds, group.id]
                        : current.addOnGroupIds.filter((groupId) => groupId !== group.id)
                    }))}
                  /> {group.name}
                </label>
              ))}
            </div>
          </div>

          <button type="button" className="admin-button mt-4" onClick={submitItem}>
            儲存品項
          </button>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="admin-panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">品項總覽</h2>
              <p className="mt-1 text-sm text-slate-500">可查看 SKU、庫存、成本與是否為套餐商品。</p>
            </div>
            <button type="button" className="admin-ghost" onClick={() => exportMutation.mutate()}>
              匯出 JSON
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">品項</th>
                  <th className="px-4 py-3 text-left">SKU</th>
                  <th className="px-4 py-3 text-left">分類</th>
                  <th className="px-4 py-3 text-left">售價</th>
                  <th className="px-4 py-3 text-left">成本</th>
                  <th className="px-4 py-3 text-left">庫存</th>
                  <th className="px-4 py-3 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {item.emoji || '🍳'} {item.name}
                      {item.isCombo && <span className="ml-2 rounded-full bg-brand-50 px-2 py-1 text-xs text-brand-700">套餐</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{item.externalCode || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{categoryNameMap.get(item.categoryId) || item.category?.name}</td>
                    <td className="px-4 py-3">NT${item.basePrice}</td>
                    <td className="px-4 py-3">NT${item.cost}</td>
                    <td className="px-4 py-3">{item.stock}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="admin-ghost"
                          onClick={() => setItemForm({
                            id: item.id,
                            name: item.name,
                            externalCode: item.externalCode || '',
                            categoryId: String(item.categoryId),
                            basePrice: String(item.basePrice),
                            cost: String(item.cost),
                            stock: String(item.stock),
                            stockAlert: String(item.stockAlert),
                            emoji: item.emoji || '🍳',
                            description: item.description || '',
                            imageUrl: item.imageUrl || '',
                            isActive: item.isActive,
                            isCombo: item.isCombo || false,
                            addOnGroupIds: (item.addOnGroups || []).map((group) => group.id),
                            timePricingText: JSON.stringify(item.timePricing || [], null, 2),
                            comboConfigText: JSON.stringify(item.comboConfig || [], null, 2)
                          })}
                        >
                          編輯
                        </button>
                        <button
                          type="button"
                          className="admin-ghost"
                          onClick={() => toggleItemMutation.mutate({ id: item.id, isActive: !item.isActive })}
                        >
                          {item.isActive ? '下架' : '上架'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">加料群組 / 菜單匯入</h2>
            <button type="button" className="admin-ghost" onClick={() => setAddonForm(defaultAddonForm())}>
              新增加料群組
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <input
              className="admin-field"
              placeholder="群組名稱"
              value={addonForm.name}
              onChange={(event) => setAddonForm((current) => ({ ...current, name: event.target.value }))}
            />
            <input
              className="admin-field"
              type="number"
              placeholder="最多可選數量"
              value={addonForm.maxSelect}
              onChange={(event) => setAddonForm((current) => ({ ...current, maxSelect: Number(event.target.value) }))}
            />
            <label className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
              <input
                checked={addonForm.required}
                onChange={(event) => setAddonForm((current) => ({ ...current, required: event.target.checked }))}
                type="checkbox"
              /> 必選群組
            </label>

            {addonForm.options.map((option, index) => (
              <div key={`${index}-${option.name}`} className="grid gap-3 md:grid-cols-[1fr_140px]">
                <input
                  className="admin-field"
                  placeholder="選項名稱"
                  value={option.name}
                  onChange={(event) => setAddonForm((current) => ({
                    ...current,
                    options: current.options.map((entry, optionIndex) => (
                      optionIndex === index ? { ...entry, name: event.target.value } : entry
                    ))
                  }))}
                />
                <input
                  className="admin-field"
                  type="number"
                  placeholder="加價"
                  value={option.price}
                  onChange={(event) => setAddonForm((current) => ({
                    ...current,
                    options: current.options.map((entry, optionIndex) => (
                      optionIndex === index ? { ...entry, price: Number(event.target.value || 0) } : entry
                    ))
                  }))}
                />
              </div>
            ))}

            <button
              type="button"
              className="admin-ghost"
              onClick={() => setAddonForm((current) => ({
                ...current,
                options: [...current.options, { name: '', price: 0 }]
              }))}
            >
              新增選項
            </button>
            <button type="button" className="admin-button" onClick={() => addonMutation.mutate(addonForm)}>
              儲存加料群組
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {addons.map((group) => (
              <div key={group.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{group.name}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {group.options.map((option) => `${option.name}${option.price ? ` (+${option.price})` : ''}`).join('、')}
                    </div>
                  </div>
                  <button type="button" className="admin-ghost" onClick={() => setAddonForm(normalizeAddonForm(group))}>
                    編輯
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <h3 className="text-lg font-bold text-slate-900">菜單匯入</h3>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              可將先前匯出的 JSON 再次匯入，若勾選完全覆蓋，將以新資料為主並重建菜單與加料群組。
            </p>
            <textarea
              className="admin-field mt-4 min-h-40 resize-none"
              placeholder="貼上菜單 JSON"
              value={importPayload}
              onChange={(event) => setImportPayload(event.target.value)}
            />
            <input
              className="admin-field mt-3"
              type="file"
              accept=".json,application/json"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setImportPayload(await file.text());
              }}
            />
            <label className="mt-3 block rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
              <input checked={replaceAll} onChange={(event) => setReplaceAll(event.target.checked)} type="checkbox" /> 完全覆蓋現有菜單
            </label>
            <button
              type="button"
              className="admin-button mt-3"
              onClick={() => {
                try {
                  importMutation.mutate({ replaceAll, data: JSON.parse(importPayload) });
                } catch {
                  toast.error('請提供合法的 JSON');
                }
              }}
            >
              開始匯入
            </button>
          </div>
        </article>
      </section>
    </div>
  );
}
