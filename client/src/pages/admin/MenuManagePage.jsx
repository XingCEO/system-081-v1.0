// 菜單管理頁面
import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function MenuManagePage() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(null); // 'category' | 'item' | null
  const [editingItem, setEditingItem] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  // 表單狀態
  const [form, setForm] = useState({
    name: '', description: '', categoryId: '', basePrice: '', cost: '',
    preparationTime: '5', isFeatured: false, isActive: true, image: ''
  });
  const [catForm, setCatForm] = useState({ name: '', icon: '', color: '#4A90D9', description: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [catRes, itemRes] = await Promise.all([
        api.get('/menu/categories', { params: { all: true } }),
        api.get('/menu/items', { params: { all: true } })
      ]);
      setCategories(catRes.data);
      setItems(itemRes.data);
    } catch (err) {
      toast.error('載入失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // 分類 CRUD
  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        await api.put(`/menu/categories/${editingCategory.id}`, catForm);
        toast.success('分類已更新');
      } else {
        await api.post('/menu/categories', catForm);
        toast.success('分類已新增');
      }
      setShowForm(null);
      setEditingCategory(null);
      setCatForm({ name: '', icon: '', color: '#4A90D9', description: '' });
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('確定要刪除此分類？')) return;
    try {
      await api.delete(`/menu/categories/${id}`);
      toast.success('分類已刪除');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // 品項 CRUD
  const handleSaveItem = async () => {
    try {
      const data = {
        ...form,
        basePrice: parseFloat(form.basePrice),
        cost: parseFloat(form.cost) || 0,
        preparationTime: parseInt(form.preparationTime) || 5,
        categoryId: parseInt(form.categoryId)
      };

      if (editingItem) {
        await api.put(`/menu/items/${editingItem.id}`, data);
        toast.success('品項已更新');
      } else {
        await api.post('/menu/items', data);
        toast.success('品項已新增');
      }
      setShowForm(null);
      setEditingItem(null);
      resetForm();
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggleItem = async (item) => {
    try {
      await api.put(`/menu/items/${item.id}`, { isActive: !item.isActive });
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const resetForm = () => {
    setForm({ name: '', description: '', categoryId: '', basePrice: '', cost: '', preparationTime: '5', isFeatured: false, isActive: true, image: '' });
  };

  const startEditItem = (item) => {
    setForm({
      name: item.name,
      description: item.description || '',
      categoryId: String(item.categoryId),
      basePrice: String(item.basePrice),
      cost: String(item.cost || ''),
      preparationTime: String(item.preparationTime),
      isFeatured: item.isFeatured,
      isActive: item.isActive,
      image: item.image || ''
    });
    setEditingItem(item);
    setShowForm('item');
  };

  const startEditCategory = (cat) => {
    setCatForm({ name: cat.name, icon: cat.icon || '', color: cat.color, description: cat.description || '' });
    setEditingCategory(cat);
    setShowForm('category');
  };

  const filteredItems = selectedCategory
    ? items.filter(i => i.categoryId === selectedCategory)
    : items;

  if (isLoading) return <div className="flex items-center justify-center h-full text-pos-muted">載入中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">菜單管理</h1>
        <div className="flex gap-2">
          <button onClick={() => { setShowForm('category'); setEditingCategory(null); setCatForm({ name: '', icon: '', color: '#4A90D9', description: '' }); }}
            className="pos-btn-primary text-sm">+ 新增分類</button>
          <button onClick={() => { setShowForm('item'); setEditingItem(null); resetForm(); }}
            className="pos-btn-success text-sm">+ 新增品項</button>
        </div>
      </div>

      {/* 分類列 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap ${!selectedCategory ? 'bg-primary-600 text-white' : 'bg-pos-accent/30 text-pos-muted'}`}>
          全部 ({items.length})
        </button>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap flex items-center gap-2 ${
              selectedCategory === cat.id ? 'text-white' : 'bg-pos-accent/30 text-pos-muted'
            }`}
            style={selectedCategory === cat.id ? { backgroundColor: cat.color } : {}}>
            {cat.icon} {cat.name}
            <span className="text-xs opacity-70">
              ({items.filter(i => i.categoryId === cat.id).length})
            </span>
            <span onClick={(e) => { e.stopPropagation(); startEditCategory(cat); }}
              className="ml-1 hover:text-white cursor-pointer">✏️</span>
          </button>
        ))}
      </div>

      {/* 品項列表 */}
      <div className="pos-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-pos-accent/30 text-sm text-pos-muted">
              <th className="text-left p-3">品名</th>
              <th className="text-left p-3">分類</th>
              <th className="text-right p-3">價格</th>
              <th className="text-right p-3">成本</th>
              <th className="text-center p-3">狀態</th>
              <th className="text-center p-3">推薦</th>
              <th className="text-center p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.id} className={`border-b border-pos-accent/10 hover:bg-pos-accent/10 ${!item.isActive ? 'opacity-50' : ''}`}>
                <td className="p-3">
                  <div className="font-medium">{item.name}</div>
                  {item.description && <div className="text-xs text-pos-muted">{item.description}</div>}
                </td>
                <td className="p-3">
                  <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: item.category?.color + '30', color: item.category?.color }}>
                    {item.category?.name}
                  </span>
                </td>
                <td className="p-3 text-right font-medium">${item.basePrice}</td>
                <td className="p-3 text-right text-pos-muted">${item.cost || 0}</td>
                <td className="p-3 text-center">
                  <button onClick={() => handleToggleItem(item)}
                    className={`text-xs px-2 py-1 rounded-full ${item.isActive ? 'bg-pos-success/20 text-pos-success' : 'bg-pos-highlight/20 text-pos-highlight'}`}>
                    {item.isActive ? '上架' : '下架'}
                  </button>
                </td>
                <td className="p-3 text-center">{item.isFeatured ? '⭐' : ''}</td>
                <td className="p-3 text-center">
                  <button onClick={() => startEditItem(item)} className="text-primary-400 hover:text-primary-300 text-sm">編輯</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredItems.length === 0 && (
          <div className="text-center text-pos-muted py-8">沒有品項</div>
        )}
      </div>

      {/* 表單彈窗 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowForm(null)}>
          <div className="bg-pos-card w-[500px] max-h-[80vh] rounded-2xl shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-pos-accent/30 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {showForm === 'category'
                  ? (editingCategory ? '編輯分類' : '新增分類')
                  : (editingItem ? '編輯品項' : '新增品項')}
              </h2>
              <button onClick={() => setShowForm(null)} className="text-pos-muted hover:text-pos-text text-2xl">×</button>
            </div>

            <div className="p-6 space-y-4">
              {showForm === 'category' ? (
                <>
                  <div>
                    <label className="text-sm text-pos-muted mb-1 block">分類名稱 *</label>
                    <input value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} className="pos-input" placeholder="例：主餐" />
                  </div>
                  <div>
                    <label className="text-sm text-pos-muted mb-1 block">圖示 (Emoji)</label>
                    <input value={catForm.icon} onChange={e => setCatForm({...catForm, icon: e.target.value})} className="pos-input" placeholder="例：🍖" />
                  </div>
                  <div>
                    <label className="text-sm text-pos-muted mb-1 block">顏色</label>
                    <input type="color" value={catForm.color} onChange={e => setCatForm({...catForm, color: e.target.value})} className="w-full h-10 rounded-lg cursor-pointer" />
                  </div>
                  <div>
                    <label className="text-sm text-pos-muted mb-1 block">描述</label>
                    <input value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} className="pos-input" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm text-pos-muted mb-1 block">品名 *</label>
                    <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="pos-input" />
                  </div>
                  <div>
                    <label className="text-sm text-pos-muted mb-1 block">分類 *</label>
                    <select value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})} className="pos-input">
                      <option value="">請選擇</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-pos-muted mb-1 block">售價 *</label>
                      <input type="number" value={form.basePrice} onChange={e => setForm({...form, basePrice: e.target.value})} className="pos-input" />
                    </div>
                    <div>
                      <label className="text-sm text-pos-muted mb-1 block">成本</label>
                      <input type="number" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} className="pos-input" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-pos-muted mb-1 block">描述</label>
                    <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="pos-input" />
                  </div>
                  <div>
                    <label className="text-sm text-pos-muted mb-1 block">製作時間（分鐘）</label>
                    <input type="number" value={form.preparationTime} onChange={e => setForm({...form, preparationTime: e.target.value})} className="pos-input" />
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.isFeatured} onChange={e => setForm({...form, isFeatured: e.target.checked})} className="w-5 h-5 rounded" />
                      <span className="text-sm">推薦品項</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} className="w-5 h-5 rounded" />
                      <span className="text-sm">上架</span>
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 p-4 border-t border-pos-accent/30">
              <button onClick={() => setShowForm(null)} className="flex-1 py-3 rounded-xl bg-pos-accent/30 text-pos-muted font-medium">取消</button>
              <button onClick={showForm === 'category' ? handleSaveCategory : handleSaveItem}
                className="flex-[2] py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold">
                儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
