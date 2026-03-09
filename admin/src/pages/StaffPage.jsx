import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function StaffPage() {
  const queryClient = useQueryClient();
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [form, setForm] = useState({ name: '', role: 'STAFF', password: '', pin: '' });

  const staffQuery = useQuery({
    queryKey: ['admin-staff'],
    queryFn: () => api.get('/staff')
  });

  const attendanceQuery = useQuery({
    queryKey: ['admin-staff-attendance', selectedStaffId],
    queryFn: () => api.get(`/staff/${selectedStaffId}/attendance`),
    enabled: Boolean(selectedStaffId)
  });

  const createStaffMutation = useMutation({
    mutationFn: (payload) => api.post('/staff', payload),
    onSuccess: () => {
      toast.success('已新增員工');
      setForm({ name: '', role: 'STAFF', password: '', pin: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    }
  });

  const clockMutation = useMutation({
    mutationFn: ({ id, action }) => api.post(`/staff/${id}/${action}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff-attendance'] });
    }
  });

  const staff = staffQuery.data || [];
  const attendance = attendanceQuery.data || [];

  return (
    <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="space-y-4">
        <article className="admin-panel p-5">
          <h2 className="text-xl font-bold text-slate-900">新增員工</h2>
          <div className="mt-4 grid gap-3">
            <input className="admin-field" placeholder="員工帳號" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <select className="admin-field" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
              <option value="OWNER">OWNER</option>
              <option value="MANAGER">MANAGER</option>
              <option value="STAFF">STAFF</option>
            </select>
            <input className="admin-field" type="password" placeholder="密碼" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
            <input className="admin-field" placeholder="PIN 碼" value={form.pin} onChange={(event) => setForm((current) => ({ ...current, pin: event.target.value }))} />
            <button type="button" className="admin-button" onClick={() => createStaffMutation.mutate(form)}>建立員工</button>
          </div>
        </article>

        <article className="admin-panel p-5">
          <h2 className="text-xl font-bold text-slate-900">員工列表</h2>
          <div className="mt-4 space-y-3">
            {staff.map((member) => (
              <button key={member.id} type="button" className="w-full rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-brand-50" onClick={() => setSelectedStaffId(member.id)}>
                <div className="font-bold text-slate-900">{member.name}</div>
                <div className="mt-1 text-sm text-slate-500">{member.role}</div>
              </button>
            ))}
          </div>
        </article>
      </section>

      <article className="admin-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">打卡記錄</h2>
          {selectedStaffId && (
            <div className="flex gap-3">
              <button type="button" className="admin-ghost" onClick={() => clockMutation.mutate({ id: selectedStaffId, action: 'clock-in' })}>上班打卡</button>
              <button type="button" className="admin-button" onClick={() => clockMutation.mutate({ id: selectedStaffId, action: 'clock-out' })}>下班打卡</button>
            </div>
          )}
        </div>
        <div className="mt-5 space-y-3">
          {attendance.map((entry) => (
            <div key={entry.id} className="rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="font-semibold text-slate-900">上班：{new Date(entry.clockIn).toLocaleString('zh-TW')}</div>
              <div className="mt-1 text-slate-500">下班：{entry.clockOut ? new Date(entry.clockOut).toLocaleString('zh-TW') : '尚未打卡'}</div>
            </div>
          ))}
          {selectedStaffId && attendance.length === 0 && (
            <div className="admin-soft p-4 text-sm text-slate-500">目前還沒有打卡資料。</div>
          )}
        </div>
      </article>
    </div>
  );
}
