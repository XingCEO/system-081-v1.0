import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function MenuPage() {
  const queryClient = useQueryClient();
  const [categoryForm, setCategoryForm] = useState({ name: '', sortOrder: 1 });
  const [itemForm, setItemForm] = useState({
    name: '',
    categoryId: '',
    basePrice: '',
    cost: '',
    stock: 20,
    stockAlert: 5,
    emoji: '🍳'
  });

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

  const createCategoryMutation = useMutation({
    mutationFn: (payload) => api.post('/menu/categories', payload),
    onSuccess: () => {
      toast.success('已新增分類');
      setCategoryForm({ name: '', sortOrder: 1 });
      queryClient.invalidateQueries({ queryKey: ['admin-menu-categories'] });
    }
  });

  const createItemMutation = useMutation({
    mutationFn: (payload) => api.post('/menu/items', payload),
    onSuccess: () => {
      toast.success('已新增品項');
      setItemForm({ name: '', categoryId: '', basePrice: '', cost: '', stock: 20, stockAlert: 5, emoji: '🍳' });
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] });
    }
  });

  const toggleItemMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/menu/items/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] })
  });

  const categories = categoriesQuery.data || [];
  const items = itemsQuery.data || [];
  const addons = addonsQuery.data || [];

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="admin-panel p-5">
          <h2 className="text-xl font-bold text-slate-900">分類管理</h2>
          <div className="mt-4 grid gap-3">
            <input className="admin-field" placeholder="分類名稱" value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} />
            <input className="admin-field" type="number" placeholder="排序" value={categoryForm.sortOrder} onChange={(event) => setCategoryForm((current) => ({ ...current, sortOrder: event.target.value }))} />
            <button type="button" className="admin-button" onClick={() => createCategoryMutation.mutate(categoryForm)}>新增分類</button>
          </div>
          <div className="mt-5 space-y-3">
            {categories.map((category) => (
              <div key={category.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="font-semibold text-slate-900">{category.name}</div>
                <div className="mt-1 text-sm text-slate-500">排序 {category.sortOrder} / {category.itemCount} 項</div>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel p-5">
          <h2 className="text-xl font-bold text-slate-900">新增品項</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="admin-field" placeholder="品項名稱" value={itemForm.name} onChange={(event) => setItemForm((current) => ({ ...current, name: event.target.value }))} />
            <select className="admin-field" value={itemForm.categoryId} onChange={(event) => setItemForm((current) => ({ ...current, categoryId: event.target.value }))}>
              <option value="">選擇分類</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <input className="admin-field" type="number" placeholder="售價" value={itemForm.basePrice} onChange={(event) => setItemForm((current) => ({ ...current, basePrice: event.target.value }))} />
            <input className="admin-field" type="number" placeholder="成本" value={itemForm.cost} onChange={(event) => setItemForm((current) => ({ ...current, cost: event.target.value }))} />
            <input className="admin-field" type="number" placeholder="庫存" value={itemForm.stock} onChange={(event) => setItemForm((current) => ({ ...current, stock: event.target.value }))} />
            <input className="admin-field" type="number" placeholder="警戒值" value={itemForm.stockAlert} onChange={(event) => setItemForm((current) => ({ ...current, stockAlert: event.target.value }))} />
            <input className="admin-field md:col-span-2" placeholder="Emoji 圖示" value={itemForm.emoji} onChange={(event) => setItemForm((current) => ({ ...current, emoji: event.target.value }))} />
          </div>
          <button type="button" className="admin-button mt-4" onClick={() => createItemMutation.mutate({ ...itemForm, basePrice: Number(itemForm.basePrice), cost: Number(itemForm.cost), stock: Number(itemForm.stock), stockAlert: Number(itemForm.stockAlert) })}>
            新增品項
          </button>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="admin-panel overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-xl font-bold text-slate-900">品項管理</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">品項</th>
                  <th className="px-4 py-3 text-left">分類</th>
                  <th className="px-4 py-3 text-left">售價</th>
                  <th className="px-4 py-3 text-left">成本</th>
                  <th className="px-4 py-3 text-left">庫存</th>
                  <th className="px-4 py-3 text-left">狀態</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.emoji} {item.name}</td>
                    <td className="px-4 py-3 text-slate-500">{item.category?.name}</td>
                    <td className="px-4 py-3">NT${item.basePrice}</td>
                    <td className="px-4 py-3">NT${item.cost}</td>
                    <td className="px-4 py-3">{item.stock}</td>
                    <td className="px-4 py-3">
                      <button type="button" className="admin-ghost" onClick={() => toggleItemMutation.mutate({ id: item.id, isActive: !item.isActive })}>
                        {item.isActive ? '下架' : '上架'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-panel p-5">
          <h2 className="text-xl font-bold text-slate-900">加料群組</h2>
          <div className="mt-5 space-y-4">
            {addons.map((group) => (
              <div key={group.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="font-semibold text-slate-900">{group.name}</div>
                <div className="mt-2 text-sm leading-7 text-slate-500">{group.options.map((option) => `${option.name}${option.price > 0 ? ` (+${option.price})` : ''}`).join('、')}</div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
