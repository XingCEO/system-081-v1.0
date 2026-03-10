import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';

function formatType(type) {
  const typeMap = {
    NEW_ORDER: '新訂單',
    STOCK_ALERT: '庫存警示',
    PICKUP_REMINDER: '取餐提醒',
    SALES_TARGET: '營業額達標',
    GENERAL: '一般通知'
  };

  return typeMap[type] || type;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => api.get('/notifications')
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
    onError: (error) => {
      toast.error(error.message || '更新通知狀態失敗');
    }
  });

  const notifications = notificationsQuery.data || [];

  return (
    <section className="admin-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">通知中心</h2>
          <p className="mt-1 text-sm text-slate-500">查看新訂單、庫存警示、叫號與營業額通知。</p>
        </div>
        <div className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
          未讀 {notifications.filter((entry) => !entry.isRead).length} 則
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {notifications.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
            目前沒有通知資料。
          </div>
        )}

        {notifications.map((notification) => (
          <article
            key={notification.id}
            className={`rounded-2xl border px-4 py-4 ${
              notification.isRead ? 'border-slate-200 bg-white' : 'border-brand-200 bg-brand-50/60'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="pill">{formatType(notification.type)}</span>
                  {!notification.isRead && (
                    <span className="text-xs font-semibold text-brand-700">未讀</span>
                  )}
                </div>
                <p className="mt-3 text-base font-semibold text-slate-900">{notification.message}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {dayjs(notification.createdAt).format('YYYY/MM/DD HH:mm')}
                </p>
              </div>

              {!notification.isRead && (
                <button
                  type="button"
                  className="admin-ghost"
                  onClick={() => markReadMutation.mutate(notification.id)}
                >
                  標記已讀
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
