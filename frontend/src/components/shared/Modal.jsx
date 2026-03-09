export default function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className={`panel w-full ${wide ? 'max-w-5xl' : 'max-w-2xl'} p-6`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="ghost-button px-3 py-2">
            關閉
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
