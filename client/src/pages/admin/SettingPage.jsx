// 系統設定頁面
import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function SettingPage() {
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
    } catch { toast.error('載入設定失敗'); }
    finally { setIsLoading(false); }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await api.post('/settings/batch', { settings });
      toast.success('設定已儲存');
    } catch (err) { toast.error(err.message); }
    finally { setIsSaving(false); }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) return <div className="flex items-center justify-center h-full text-pos-muted">載入中...</div>;

  const groups = [
    {
      title: '店家資訊',
      items: [
        { key: 'store_name', label: '店家名稱', type: 'text' },
        { key: 'store_phone', label: '店家電話', type: 'text' },
        { key: 'store_address', label: '店家地址', type: 'text' },
      ]
    },
    {
      title: '稅務設定',
      items: [
        { key: 'tax_rate', label: '營業稅率', type: 'number', hint: '例：0.05 = 5%' },
        { key: 'tax_included', label: '售價含稅', type: 'boolean' },
      ]
    },
    {
      title: '收據設定',
      items: [
        { key: 'receipt_header', label: '收據表頭', type: 'text' },
        { key: 'receipt_footer', label: '收據表尾', type: 'text' },
      ]
    },
    {
      title: '會員設定',
      items: [
        { key: 'points_dollar_value', label: '每消費多少元得 1 點', type: 'number' },
      ]
    }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">系統設定</h1>
        <button onClick={handleSave} disabled={isSaving}
          className="pos-btn-primary text-sm disabled:opacity-50">
          {isSaving ? '儲存中...' : '儲存設定'}
        </button>
      </div>

      <div className="space-y-6">
        {groups.map(group => (
          <div key={group.title} className="pos-card p-6">
            <h2 className="text-lg font-bold mb-4">{group.title}</h2>
            <div className="space-y-4">
              {group.items.map(item => (
                <div key={item.key} className="flex items-center gap-4">
                  <label className="w-40 text-sm text-pos-muted flex-shrink-0">{item.label}</label>
                  {item.type === 'boolean' ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={settings[item.key] === true || settings[item.key] === 'true'}
                        onChange={e => updateSetting(item.key, e.target.checked)}
                        className="w-5 h-5 rounded" />
                      <span className="text-sm">{settings[item.key] ? '是' : '否'}</span>
                    </label>
                  ) : (
                    <div className="flex-1">
                      <input
                        type={item.type === 'number' ? 'number' : 'text'}
                        value={settings[item.key] ?? ''}
                        onChange={e => updateSetting(item.key, item.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                        className="pos-input"
                        step={item.type === 'number' ? '0.01' : undefined}
                      />
                      {item.hint && <div className="text-xs text-pos-muted mt-1">{item.hint}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}