import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function TablesPage() {
  const queryClient = useQueryClient();
  const [reservationForm, setReservationForm] = useState({
    tableId: '',
    memberName: '',
    phone: '',
    partySize: 2,
    datetime: '',
    note: ''
  });

  const tablesQuery = useQuery({
    queryKey: ['admin-tables'],
    queryFn: () => api.get('/tables')
  });

  const reservationsQuery = useQuery({
    queryKey: ['admin-reservations'],
    queryFn: () => api.get('/reservations')
  });

  const createReservationMutation = useMutation({
    mutationFn: (payload) => api.post('/reservations', payload),
    onSuccess: () => {
      toast.success('已建立預約');
      setReservationForm({ tableId: '', memberName: '', phone: '', partySize: 2, datetime: '', note: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tables'] });
    }
  });

  const tables = tablesQuery.data || [];
  const reservations = reservationsQuery.data || [];

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="admin-panel p-5">
          <h2 className="text-xl font-bold text-slate-900">桌位圖</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tables.map((table) => (
              <div key={table.id} className="admin-soft overflow-hidden">
                <div className="border-b border-slate-100 px-4 py-3">
                  <div className="font-bold text-slate-900">{table.number} 號桌</div>
                  <div className="mt-1 text-sm text-slate-500">{table.capacity} 人座 / {table.status}</div>
                </div>
                <div className="p-4">
                  <img alt={`桌號 ${table.number} QR Code`} className="mx-auto h-36 w-36 rounded-2xl border border-slate-100 bg-white p-2" src={table.qrCode} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel p-5">
          <h2 className="text-xl font-bold text-slate-900">新增預約</h2>
          <div className="mt-4 grid gap-3">
            <select className="admin-field" value={reservationForm.tableId} onChange={(event) => setReservationForm((current) => ({ ...current, tableId: event.target.value }))}>
              <option value="">選擇桌位</option>
              {tables.map((table) => <option key={table.id} value={table.id}>{table.number} 號桌</option>)}
            </select>
            <input className="admin-field" placeholder="姓名" value={reservationForm.memberName} onChange={(event) => setReservationForm((current) => ({ ...current, memberName: event.target.value }))} />
            <input className="admin-field" placeholder="電話" value={reservationForm.phone} onChange={(event) => setReservationForm((current) => ({ ...current, phone: event.target.value }))} />
            <input className="admin-field" type="number" value={reservationForm.partySize} onChange={(event) => setReservationForm((current) => ({ ...current, partySize: event.target.value }))} />
            <input className="admin-field" type="datetime-local" value={reservationForm.datetime} onChange={(event) => setReservationForm((current) => ({ ...current, datetime: event.target.value }))} />
            <textarea className="admin-field min-h-24 resize-none" placeholder="備註" value={reservationForm.note} onChange={(event) => setReservationForm((current) => ({ ...current, note: event.target.value }))} />
            <button type="button" className="admin-button" onClick={() => createReservationMutation.mutate({ ...reservationForm, tableId: Number(reservationForm.tableId), partySize: Number(reservationForm.partySize) })}>建立預約</button>
          </div>
        </article>
      </section>

      <article className="admin-panel p-5">
        <h2 className="text-xl font-bold text-slate-900">預約列表</h2>
        <div className="mt-5 space-y-3">
          {reservations.map((reservation) => (
            <div key={reservation.id} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900">{reservation.memberName} / {reservation.table.number} 號桌</div>
                  <div className="mt-1 text-sm text-slate-500">{new Date(reservation.datetime).toLocaleString('zh-TW')} / {reservation.partySize} 人</div>
                </div>
                <div className="text-sm font-semibold text-brand-700">{reservation.status}</div>
              </div>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
