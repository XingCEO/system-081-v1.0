import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';

function defaultTableForm() {
  return { id: null, number: '', capacity: 4, status: 'AVAILABLE' };
}

function defaultReservationForm() {
  return { id: null, tableId: '', memberName: '', phone: '', partySize: 2, datetime: '', note: '', status: 'PENDING' };
}

export default function TablesPage() {
  const queryClient = useQueryClient();
  const [tableForm, setTableForm] = useState(defaultTableForm());
  const [reservationForm, setReservationForm] = useState(defaultReservationForm());

  const tablesQuery = useQuery({
    queryKey: ['admin-tables'],
    queryFn: () => api.get('/tables')
  });

  const reservationsQuery = useQuery({
    queryKey: ['admin-reservations'],
    queryFn: () => api.get('/reservations')
  });

  const saveTableMutation = useMutation({
    mutationFn: (payload) => (
      payload.id ? api.put(`/tables/${payload.id}`, payload) : api.post('/tables', payload)
    ),
    onSuccess: () => {
      toast.success('桌位資料已儲存');
      setTableForm(defaultTableForm());
      queryClient.invalidateQueries({ queryKey: ['admin-tables'] });
    }
  });

  const saveReservationMutation = useMutation({
    mutationFn: (payload) => (
      payload.id ? api.put(`/reservations/${payload.id}`, payload) : api.post('/reservations', payload)
    ),
    onSuccess: () => {
      toast.success('預約資料已儲存');
      setReservationForm(defaultReservationForm());
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
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">桌位圖</h2>
            <button type="button" className="admin-ghost" onClick={() => setTableForm(defaultTableForm())}>新增桌位</button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tables.map((table) => (
              <button key={table.id} type="button" className="admin-soft overflow-hidden text-left" onClick={() => setTableForm(table)}>
                <div className="border-b border-slate-100 px-4 py-3">
                  <div className="font-bold text-slate-900">{table.number} 號桌</div>
                  <div className="mt-1 text-sm text-slate-500">{table.capacity} 人 / {table.status}</div>
                </div>
                <div className="p-4">
                  <img alt={`桌號 ${table.number} QR Code`} className="mx-auto h-36 w-36 rounded-2xl border border-slate-100 bg-white p-2" src={table.qrCode} />
                </div>
              </button>
            ))}
          </div>
        </article>

        <article className="admin-panel p-5">
          <h2 className="text-xl font-bold text-slate-900">桌位與預約設定</h2>
          <div className="mt-4 grid gap-6">
            <div className="rounded-2xl border border-slate-100 p-4">
              <div className="text-sm font-semibold text-slate-700">桌位資料</div>
              <div className="mt-3 grid gap-3">
                <input className="admin-field" placeholder="桌號，例如 01" value={tableForm.number} onChange={(event) => setTableForm((current) => ({ ...current, number: event.target.value }))} />
                <input className="admin-field" type="number" value={tableForm.capacity} onChange={(event) => setTableForm((current) => ({ ...current, capacity: Number(event.target.value) }))} />
                <select className="admin-field" value={tableForm.status} onChange={(event) => setTableForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="OCCUPIED">OCCUPIED</option>
                  <option value="RESERVED">RESERVED</option>
                  <option value="CLEANING">CLEANING</option>
                </select>
                <button type="button" className="admin-button" onClick={() => saveTableMutation.mutate(tableForm)}>儲存桌位</button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 p-4">
              <div className="text-sm font-semibold text-slate-700">新增 / 編輯預約</div>
              <div className="mt-3 grid gap-3">
                <select className="admin-field" value={reservationForm.tableId} onChange={(event) => setReservationForm((current) => ({ ...current, tableId: event.target.value }))}>
                  <option value="">請選擇桌位</option>
                  {tables.map((table) => <option key={table.id} value={table.id}>{table.number} 號桌</option>)}
                </select>
                <input className="admin-field" placeholder="姓名" value={reservationForm.memberName} onChange={(event) => setReservationForm((current) => ({ ...current, memberName: event.target.value }))} />
                <input className="admin-field" placeholder="手機" value={reservationForm.phone} onChange={(event) => setReservationForm((current) => ({ ...current, phone: event.target.value }))} />
                <input className="admin-field" type="number" value={reservationForm.partySize} onChange={(event) => setReservationForm((current) => ({ ...current, partySize: Number(event.target.value) }))} />
                <input className="admin-field" type="datetime-local" value={reservationForm.datetime} onChange={(event) => setReservationForm((current) => ({ ...current, datetime: event.target.value }))} />
                <select className="admin-field" value={reservationForm.status} onChange={(event) => setReservationForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="PENDING">PENDING</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="SEATED">SEATED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="NO_SHOW">NO_SHOW</option>
                </select>
                <textarea className="admin-field min-h-24 resize-none" placeholder="備註" value={reservationForm.note} onChange={(event) => setReservationForm((current) => ({ ...current, note: event.target.value }))} />
                <button type="button" className="admin-button" onClick={() => saveReservationMutation.mutate({ ...reservationForm, tableId: Number(reservationForm.tableId) })}>儲存預約</button>
              </div>
            </div>
          </div>
        </article>
      </section>

      <article className="admin-panel p-5">
        <h2 className="text-xl font-bold text-slate-900">預約列表</h2>
        <div className="mt-5 space-y-3">
          {reservations.map((reservation) => (
            <button key={reservation.id} type="button" className="w-full rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-brand-50" onClick={() => setReservationForm({
              id: reservation.id,
              tableId: reservation.tableId,
              memberName: reservation.memberName,
              phone: reservation.phone,
              partySize: reservation.partySize,
              datetime: reservation.datetime.slice(0, 16),
              note: reservation.note || '',
              status: reservation.status
            })}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900">{reservation.memberName} / {reservation.table.number} 號桌</div>
                  <div className="mt-1 text-sm text-slate-500">{new Date(reservation.datetime).toLocaleString('zh-TW')} / {reservation.partySize} 人</div>
                </div>
                <div className="text-sm font-semibold text-brand-700">{reservation.status}</div>
              </div>
            </button>
          ))}
        </div>
      </article>
    </div>
  );
}
