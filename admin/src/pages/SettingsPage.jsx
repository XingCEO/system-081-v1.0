import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';

function defaultForm() {
  return {
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
  };
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm());
  const [restorePayload, setRestorePayload] = useState('');

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
    onSuccess: () => {
      toast.success('設定已更新');
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
    onError: (error) => toast.error(error.message || '設定更新失敗')
  });

  const backupMutation = useMutation({
    mutationFn: () => api.get('/settings/backup'),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `system-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('完整備份已匯出');
    },
    onError: (error) => toast.error(error.message || '備份匯出失敗')
  });

  const restoreMutation = useMutation({
    mutationFn: (payload) => api.post('/settings/restore', payload),
    onSuccess: () => {
      toast.success('資料還原完成，請重新整理頁面確認資料。');
      setRestorePayload('');
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
    onError: (error) => toast.error(error.message || '資料還原失敗')
  });

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <article className="admin-panel p-5">
        <h2 className="text-xl font-bold text-slate-900">店家與列印設定</h2>
        <div className="mt-4 grid gap-3">
          <input
            className="admin-field"
            placeholder="店家名稱"
            value={form.store_profile.name}
            onChange={(event) => setForm((current) => ({
              ...current,
              store_profile: { ...current.store_profile, name: event.target.value }
            }))}
          />
          <input
            className="admin-field"
            placeholder="店家地址"
            value={form.store_profile.address}
            onChange={(event) => setForm((current) => ({
              ...current,
              store_profile: { ...current.store_profile, address: event.target.value }
            }))}
          />
          <input
            className="admin-field"
            placeholder="店家電話"
            value={form.store_profile.phone}
            onChange={(event) => setForm((current) => ({
              ...current,
              store_profile: { ...current.store_profile, phone: event.target.value }
            }))}
          />
        </div>

        <h2 className="mt-8 text-xl font-bold text-slate-900">熱感列印機</h2>
        <div className="mt-4 grid gap-3">
          <input
            className="admin-field"
            placeholder="列印機 IP"
            value={form.printer_settings.ip}
            onChange={(event) => setForm((current) => ({
              ...current,
              printer_settings: { ...current.printer_settings, ip: event.target.value }
            }))}
          />
          <input
            className="admin-field"
            type="number"
            placeholder="Port"
            value={form.printer_settings.port}
            onChange={(event) => setForm((current) => ({
              ...current,
              printer_settings: { ...current.printer_settings, port: Number(event.target.value) }
            }))}
          />
          <input
            className="admin-field"
            type="number"
            placeholder="紙寬 mm"
            value={form.printer_settings.width}
            onChange={(event) => setForm((current) => ({
              ...current,
              printer_settings: { ...current.printer_settings, width: Number(event.target.value) }
            }))}
          />
        </div>

        <h2 className="mt-8 text-xl font-bold text-slate-900">稅率與點數規則</h2>
        <div className="mt-4 grid gap-3">
          <label className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
            <input
              checked={form.tax_rule.enabled}
              onChange={(event) => setForm((current) => ({
                ...current,
                tax_rule: { ...current.tax_rule, enabled: event.target.checked }
              }))}
              type="checkbox"
            /> 啟用稅率
          </label>
          <input
            className="admin-field"
            type="number"
            placeholder="稅率 (%)"
            value={form.tax_rule.rate}
            onChange={(event) => setForm((current) => ({
              ...current,
              tax_rule: { ...current.tax_rule, rate: Number(event.target.value) }
            }))}
          />
          <input
            className="admin-field"
            type="number"
            placeholder="每滿多少元送點"
            value={form.points_rule.earnEvery}
            onChange={(event) => setForm((current) => ({
              ...current,
              points_rule: { ...current.points_rule, earnEvery: Number(event.target.value) }
            }))}
          />
          <input
            className="admin-field"
            type="number"
            placeholder="送點數量"
            value={form.points_rule.earnPoints}
            onChange={(event) => setForm((current) => ({
              ...current,
              points_rule: { ...current.points_rule, earnPoints: Number(event.target.value) }
            }))}
          />
          <input
            className="admin-field"
            type="number"
            placeholder="每點可折抵金額"
            value={form.points_rule.redeemRate}
            onChange={(event) => setForm((current) => ({
              ...current,
              points_rule: { ...current.points_rule, redeemRate: Number(event.target.value) }
            }))}
          />
        </div>
      </article>

      <article className="admin-panel p-5">
        <h2 className="text-xl font-bold text-slate-900">通知與營運設定</h2>
        <div className="mt-4 grid gap-3">
          <input
            className="admin-field"
            placeholder="LINE Notify Token"
            value={form.notification_settings.lineNotifyToken}
            onChange={(event) => setForm((current) => ({
              ...current,
              notification_settings: { ...current.notification_settings, lineNotifyToken: event.target.value }
            }))}
          />
          <input
            className="admin-field"
            type="number"
            placeholder="每日營業額目標"
            value={form.notification_settings.dailySalesTarget}
            onChange={(event) => setForm((current) => ({
              ...current,
              notification_settings: { ...current.notification_settings, dailySalesTarget: Number(event.target.value) }
            }))}
          />
          {[
            ['newOrder', '新訂單通知'],
            ['stockAlert', '庫存警示通知'],
            ['pickupReminder', '取餐提醒通知'],
            ['salesTarget', '達標通知']
          ].map(([key, label]) => (
            <label key={key} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
              <input
                checked={form.notification_settings[key]}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  notification_settings: { ...current.notification_settings, [key]: event.target.checked }
                }))}
                type="checkbox"
              /> {label}
            </label>
          ))}

          <label className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
            <input
              checked={form.ordering_state.paused}
              onChange={(event) => setForm((current) => ({
                ...current,
                ordering_state: { paused: event.target.checked }
              }))}
              type="checkbox"
            /> 暫停接單
          </label>

          <button type="button" className="admin-button" onClick={() => saveMutation.mutate(form)}>
            儲存全部設定
          </button>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6">
          <h3 className="text-lg font-bold text-slate-900">資料備份 / 還原</h3>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            備份會包含使用者、菜單、會員、訂單、設定與通知資料。還原會完整覆蓋目前資料，請務必確認備份檔來源。
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="admin-ghost" onClick={() => backupMutation.mutate()}>
              匯出完整備份
            </button>
          </div>

          <textarea
            className="admin-field mt-4 min-h-40 resize-none"
            placeholder="貼上完整備份 JSON"
            value={restorePayload}
            onChange={(event) => setRestorePayload(event.target.value)}
          />
          <input
            className="admin-field mt-3"
            type="file"
            accept=".json,application/json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setRestorePayload(await file.text());
            }}
          />
          <button
            type="button"
            className="admin-button mt-3"
            onClick={() => {
              try {
                restoreMutation.mutate({
                  replaceAll: true,
                  data: JSON.parse(restorePayload)
                });
              } catch {
                toast.error('請提供合法的備份 JSON');
              }
            }}
          >
            還原整個系統
          </button>
        </div>
      </article>
    </div>
  );
}
