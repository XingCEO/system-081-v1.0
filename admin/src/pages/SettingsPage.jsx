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
    ordering_state: { paused: false },
    tax_rule: { enabled: false, rate: 0 },
    points_rule: { earnEvery: 30, earnPoints: 1, redeemRate: 1 }
  });

  const settingsQuery = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/settings')
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setForm({
        store_profile: settingsQuery.data.storeProfile,
        printer_settings: settingsQuery.data.printerSettings,
        notification_settings: settingsQuery.data.notificationSettings,
        ordering_state: settingsQuery.data.orderingState,
        tax_rule: settingsQuery.data.taxRule,
        points_rule: settingsQuery.data.pointsRule
      });
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (payload) => api.put('/settings', payload),
    onSuccess: () => toast.success('系統設定已更新')
  });

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <article className="admin-panel p-5">
        <h2 className="text-xl font-bold text-slate-900">店家基本資料</h2>
        <div className="mt-4 grid gap-3">
          <input className="admin-field" placeholder="店名" value={form.store_profile.name} onChange={(event) => setForm((current) => ({ ...current, store_profile: { ...current.store_profile, name: event.target.value } }))} />
          <input className="admin-field" placeholder="地址" value={form.store_profile.address} onChange={(event) => setForm((current) => ({ ...current, store_profile: { ...current.store_profile, address: event.target.value } }))} />
          <input className="admin-field" placeholder="電話" value={form.store_profile.phone} onChange={(event) => setForm((current) => ({ ...current, store_profile: { ...current.store_profile, phone: event.target.value } }))} />
        </div>

        <h2 className="mt-8 text-xl font-bold text-slate-900">列印機設定</h2>
        <div className="mt-4 grid gap-3">
          <input className="admin-field" placeholder="印表機 IP" value={form.printer_settings.ip} onChange={(event) => setForm((current) => ({ ...current, printer_settings: { ...current.printer_settings, ip: event.target.value } }))} />
          <input className="admin-field" type="number" placeholder="Port" value={form.printer_settings.port} onChange={(event) => setForm((current) => ({ ...current, printer_settings: { ...current.printer_settings, port: Number(event.target.value) } }))} />
          <input className="admin-field" type="number" placeholder="紙寬 mm" value={form.printer_settings.width} onChange={(event) => setForm((current) => ({ ...current, printer_settings: { ...current.printer_settings, width: Number(event.target.value) } }))} />
        </div>

        <h2 className="mt-8 text-xl font-bold text-slate-900">稅率與點數</h2>
        <div className="mt-4 grid gap-3">
          <label className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
            <input checked={form.tax_rule.enabled} onChange={(event) => setForm((current) => ({ ...current, tax_rule: { ...current.tax_rule, enabled: event.target.checked } }))} type="checkbox" /> 啟用稅率
          </label>
          <input className="admin-field" type="number" placeholder="稅率 %" value={form.tax_rule.rate} onChange={(event) => setForm((current) => ({ ...current, tax_rule: { ...current.tax_rule, rate: Number(event.target.value) } }))} />
          <input className="admin-field" type="number" placeholder="每滿多少元贈點" value={form.points_rule.earnEvery} onChange={(event) => setForm((current) => ({ ...current, points_rule: { ...current.points_rule, earnEvery: Number(event.target.value) } }))} />
          <input className="admin-field" type="number" placeholder="贈點數" value={form.points_rule.earnPoints} onChange={(event) => setForm((current) => ({ ...current, points_rule: { ...current.points_rule, earnPoints: Number(event.target.value) } }))} />
          <input className="admin-field" type="number" placeholder="每點折抵金額" value={form.points_rule.redeemRate} onChange={(event) => setForm((current) => ({ ...current, points_rule: { ...current.points_rule, redeemRate: Number(event.target.value) } }))} />
        </div>
      </article>

      <article className="admin-panel p-5">
        <h2 className="text-xl font-bold text-slate-900">通知與營運狀態</h2>
        <div className="mt-4 grid gap-3">
          <input className="admin-field" placeholder="LINE Notify Token" value={form.notification_settings.lineNotifyToken} onChange={(event) => setForm((current) => ({ ...current, notification_settings: { ...current.notification_settings, lineNotifyToken: event.target.value } }))} />
          <input className="admin-field" type="number" placeholder="單日營業額目標" value={form.notification_settings.dailySalesTarget} onChange={(event) => setForm((current) => ({ ...current, notification_settings: { ...current.notification_settings, dailySalesTarget: Number(event.target.value) } }))} />
          {[
            ['newOrder', '新訂單通知'],
            ['stockAlert', '低庫存警示'],
            ['pickupReminder', '取餐提醒'],
            ['salesTarget', '達標通知']
          ].map(([key, label]) => (
            <label key={key} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
              <input checked={form.notification_settings[key]} onChange={(event) => setForm((current) => ({ ...current, notification_settings: { ...current.notification_settings, [key]: event.target.checked } }))} type="checkbox" /> {label}
            </label>
          ))}
          <label className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
            <input checked={form.ordering_state.paused} onChange={(event) => setForm((current) => ({ ...current, ordering_state: { paused: event.target.checked } }))} type="checkbox" /> 暫停接單
          </label>
          <button type="button" className="admin-button" onClick={() => saveMutation.mutate(form)}>儲存所有設定</button>
        </div>
      </article>
    </div>
  );
}
