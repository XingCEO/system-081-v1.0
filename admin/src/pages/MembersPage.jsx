import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function MembersPage() {
  const queryClient = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', birthday: '' });

  const membersQuery = useQuery({
    queryKey: ['admin-members'],
    queryFn: () => api.get('/members')
  });

  const memberDetailQuery = useQuery({
    queryKey: ['admin-member-detail', selectedMemberId],
    queryFn: () => api.get(`/members/${selectedMemberId}`),
    enabled: Boolean(selectedMemberId)
  });

  const createMemberMutation = useMutation({
    mutationFn: (payload) => api.post('/members', payload),
    onSuccess: () => {
      toast.success('已建立會員');
      setForm({ name: '', phone: '', birthday: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
    }
  });

  const members = membersQuery.data || [];
  const detail = memberDetailQuery.data;

  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <section className="space-y-4">
        <article className="admin-panel p-5">
          <h2 className="text-xl font-bold text-slate-900">新增會員</h2>
          <div className="mt-4 grid gap-3">
            <input className="admin-field" placeholder="姓名" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <input className="admin-field" placeholder="電話" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            <input className="admin-field" type="date" value={form.birthday} onChange={(event) => setForm((current) => ({ ...current, birthday: event.target.value }))} />
            <button type="button" className="admin-button" onClick={() => createMemberMutation.mutate(form)}>建立會員</button>
          </div>
        </article>

        <article className="admin-panel p-5">
          <h2 className="text-xl font-bold text-slate-900">會員列表</h2>
          <div className="mt-4 space-y-3">
            {members.map((member) => (
              <button key={member.id} type="button" className="w-full rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-brand-50" onClick={() => setSelectedMemberId(member.id)}>
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
          <div className="mt-5 admin-soft p-5 text-sm text-slate-500">從左側選一位會員查看消費紀錄與點數歷程。</div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
            <section className="space-y-3">
              <div className="admin-soft p-4">
                <div className="font-bold text-slate-900">{detail.name}</div>
                <div className="mt-1 text-sm text-slate-500">{detail.phone}</div>
                <div className="mt-3 text-sm font-semibold text-brand-700">{detail.points} 點 / NT${detail.totalSpent}</div>
                <div className="mt-2 text-sm text-slate-500">{detail.isBlacklisted ? '黑名單會員' : '正常會員'}</div>
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
                <h3 className="font-bold text-slate-900">集點紀錄</h3>
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
