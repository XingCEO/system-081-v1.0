import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';

function defaultForm() {
  return { id: null, name: '', phone: '', birthday: '', isBlacklisted: false };
}

export default function MembersPage() {
  const queryClient = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [form, setForm] = useState(defaultForm());
  const [pointForm, setPointForm] = useState({ points: 0, type: 'ADJUST', note: '' });

  const membersQuery = useQuery({
    queryKey: ['admin-members'],
    queryFn: () => api.get('/members')
  });

  const memberDetailQuery = useQuery({
    queryKey: ['admin-member-detail', selectedMemberId],
    queryFn: () => api.get(`/members/${selectedMemberId}`),
    enabled: Boolean(selectedMemberId)
  });

  useEffect(() => {
    if (memberDetailQuery.data) {
      setForm({
        id: memberDetailQuery.data.id,
        name: memberDetailQuery.data.name,
        phone: memberDetailQuery.data.phone,
        birthday: memberDetailQuery.data.birthday ? memberDetailQuery.data.birthday.slice(0, 10) : '',
        isBlacklisted: memberDetailQuery.data.isBlacklisted
      });
    }
  }, [memberDetailQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (payload) => (
      payload.id ? api.put(`/members/${payload.id}`, payload) : api.post('/members', payload)
    ),
    onSuccess: () => {
      toast.success('會員資料已儲存');
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      if (selectedMemberId) {
        queryClient.invalidateQueries({ queryKey: ['admin-member-detail', selectedMemberId] });
      }
      if (!form.id) {
        setForm(defaultForm());
      }
    },
    onError: (error) => toast.error(error.message || '會員資料儲存失敗')
  });

  const pointMutation = useMutation({
    mutationFn: (payload) => api.post(`/members/${selectedMemberId}/points`, payload),
    onSuccess: () => {
      toast.success('點數調整完成');
      setPointForm({ points: 0, type: 'ADJUST', note: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-member-detail', selectedMemberId] });
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
    },
    onError: (error) => toast.error(error.message || '點數調整失敗')
  });

  const members = membersQuery.data || [];
  const detail = memberDetailQuery.data;

  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <section className="space-y-4">
        <article className="admin-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">{form.id ? '編輯會員' : '新增會員'}</h2>
            <button
              type="button"
              className="admin-ghost"
              onClick={() => {
                setSelectedMemberId(null);
                setForm(defaultForm());
              }}
            >
              清空表單
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            <input className="admin-field" placeholder="姓名" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <input className="admin-field" placeholder="手機號碼" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            <input className="admin-field" type="date" value={form.birthday} onChange={(event) => setForm((current) => ({ ...current, birthday: event.target.value }))} />
            <label className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
              <input checked={form.isBlacklisted} onChange={(event) => setForm((current) => ({ ...current, isBlacklisted: event.target.checked }))} type="checkbox" /> 加入黑名單
            </label>
            <button type="button" className="admin-button" onClick={() => saveMutation.mutate(form)}>儲存會員</button>
          </div>
        </article>

        <article className="admin-panel p-5">
          <h2 className="text-xl font-bold text-slate-900">會員列表</h2>
          <div className="mt-4 space-y-3">
            {members.map((member) => (
              <button
                key={member.id}
                type="button"
                className="w-full rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-brand-50"
                onClick={() => setSelectedMemberId(member.id)}
              >
                <div className="font-bold text-slate-900">{member.name}</div>
                <div className="mt-1 text-sm text-slate-500">{member.phone}</div>
                <div className="mt-2 text-sm font-semibold text-brand-700">{member.points} 點 / NT${member.totalSpent}</div>
              </button>
            ))}
          </div>
        </article>
      </section>

      <article className="admin-panel p-5">
        <h2 className="text-xl font-bold text-slate-900">會員詳情</h2>
        {!detail ? (
          <div className="mt-5 admin-soft p-5 text-sm text-slate-500">請從左側選擇會員，以查看消費紀錄與點數異動。</div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
            <section className="space-y-4">
              <div className="admin-soft p-4">
                <div className="font-bold text-slate-900">{detail.name}</div>
                <div className="mt-1 text-sm text-slate-500">{detail.phone}</div>
                <div className="mt-3 text-sm font-semibold text-brand-700">{detail.points} 點 / NT${detail.totalSpent}</div>
                <div className="mt-2 text-sm text-slate-500">{detail.isBlacklisted ? '黑名單會員' : '正常會員'}</div>
              </div>

              <div className="admin-soft p-4">
                <h3 className="font-bold text-slate-900">手動調整點數</h3>
                <div className="mt-3 grid gap-3">
                  <select className="admin-field" value={pointForm.type} onChange={(event) => setPointForm((current) => ({ ...current, type: event.target.value }))}>
                    <option value="ADJUST">手動調整</option>
                    <option value="EARN">補點</option>
                    <option value="REDEEM">扣點</option>
                  </select>
                  <input className="admin-field" type="number" value={pointForm.points} onChange={(event) => setPointForm((current) => ({ ...current, points: Number(event.target.value || 0) }))} />
                  <textarea className="admin-field min-h-24 resize-none" placeholder="備註" value={pointForm.note} onChange={(event) => setPointForm((current) => ({ ...current, note: event.target.value }))} />
                  <button type="button" className="admin-button" onClick={() => pointMutation.mutate(pointForm)}>送出點數調整</button>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="admin-soft p-4">
                <h3 className="font-bold text-slate-900">消費紀錄</h3>
                <div className="mt-3 space-y-3">
                  {detail.orders.map((order) => (
                    <div key={order.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                      <div className="font-semibold text-slate-900">{order.orderNumber}</div>
                      <div className="mt-1 text-slate-500">NT${order.total}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="admin-soft p-4">
                <h3 className="font-bold text-slate-900">點數紀錄</h3>
                <div className="mt-3 space-y-3">
                  {detail.pointHistory.map((history) => (
                    <div key={history.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                      <div className="font-semibold text-slate-900">{history.type}</div>
                      <div className="mt-1 text-slate-500">{history.points} 點</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </article>
    </div>
  );
}
