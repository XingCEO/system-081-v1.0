import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function SettingsPage() {
  const [form, setForm] = useState({
    store_profile: { name: '', address: '', phone: '' },
    printer_settings: { ip: '', port: 9100, width: 80 },
    notification_settings: {
      lineNotifyToken: '',
      newOrder: true,
      stockAlert: true,
      pickupReminder: true,
      salesTarget: true,
      dailySalesTarget: 5000
    },
    ordering_state: { paused: false }
  });

  const settingsQuery = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/settings')
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setForm((current) => ({
        ...current,
        store_profile: settingsQuery.data.storeProfile,
        printer_settings: settingsQuery.data.printerSettings,
        notification_settings: settingsQuery.data.notificationSettings,
        ordering_state: settingsQuery.data.orderingState
      }));
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (payload) => api.put('/settings', payload),
    onSuccess: () => toast.success('設定已儲存')
  });

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <article className="admin-panel p-5">
        <h2 className="text-xl font-bold text-slate-900">店家資訊</h2>
        <div className="mt-4 grid gap-3">
          <input className="admin-field" placeholder="店名" value={form.store_profile.name} onChange={(event) => setForm((current) => ({ ...current, store_profile: { ...current.store_profile, name: event.target.value } }))} />
          <input className="admin-field" placeholder="地址" value={form.store_profile.address} onChange={(event) => setForm((current) => ({ ...current, store_profile: { ...current.store_profile, address: event.target.value } }))} />
          <input className="admin-field" placeholder="電話" value={form.store_profile.phone} onChange={(event) => setForm((current) => ({ ...current, store_profile: { ...current.store_profile, phone: event.target.value } }))} />
        </div>

        <h2 className="mt-8 text-xl font-bold text-slate-900">列印機設定</h2>
        <div className="mt-4 grid gap-3">
          <input className="admin-field" placeholder="IP 位址" value={form.printer_settings.ip} onChange={(event) => setForm((current) => ({ ...current, printer_settings: { ...current.printer_settings, ip: event.target.value } }))} />
          <input className="admin-field" type="number" placeholder="Port" value={form.printer_settings.port} onChange={(event) => setForm((current) => ({ ...current, printer_settings: { ...current.printer_settings, port: Number(event.target.value) } }))} />
        </div>
      </article>

      <article className="admin-panel p-5">
        <h2 className="text-xl font-bold text-slate-900">通知與營運設定</h2>
        <div className="mt-4 grid gap-3">
          <input className="admin-field" placeholder="LINE Notify Token" value={form.notification_settings.lineNotifyToken} onChange={(event) => setForm((current) => ({ ...current, notification_settings: { ...current.notification_settings, lineNotifyToken: event.target.value } }))} />
          <input className="admin-field" type="number" placeholder="每日營業額目標" value={form.notification_settings.dailySalesTarget} onChange={(event) => setForm((current) => ({ ...current, notification_settings: { ...current.notification_settings, dailySalesTarget: Number(event.target.value) } }))} />
          <label className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600"><input checked={form.notification_settings.newOrder} onChange={(event) => setForm((current) => ({ ...current, notification_settings: { ...current.notification_settings, newOrder: event.target.checked } }))} type="checkbox" /> 新訂單通知</label>
          <label className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600"><input checked={form.notification_settings.stockAlert} onChange={(event) => setForm((current) => ({ ...current, notification_settings: { ...current.notification_settings, stockAlert: event.target.checked } }))} type="checkbox" /> 庫存警示</label>
          <label className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600"><input checked={form.ordering_state.paused} onChange={(event) => setForm((current) => ({ ...current, ordering_state: { paused: event.target.checked } }))} type="checkbox" /> 暫停點餐</label>
          <button type="button" className="admin-button" onClick={() => saveMutation.mutate(form)}>儲存系統設定</button>
        </div>
      </article>
    </div>
  );
}
