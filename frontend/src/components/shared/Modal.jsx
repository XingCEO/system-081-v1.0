export default function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className={`panel w-full ${wide ? 'max-w-5xl' : 'max-w-2xl'} p-6`}>
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="text-sm font-semibold text-brand-600">Breakfast POS</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="ghost-button px-3 py-2">
            關閉
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
