export default function Dialog({ title, children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className={`admin-panel w-full ${wide ? 'max-w-5xl' : 'max-w-3xl'} p-6`}>
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="text-sm font-semibold text-brand-600">Breakfast POS Admin</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">{title}</h2>
          </div>
          <button type="button" className="admin-ghost px-3 py-2" onClick={onClose}>
            關閉
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
