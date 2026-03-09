import { useMemo, useState } from 'react';
import Modal from './Modal';

function buildInitialSelection(item) {
  const initial = {};
  (item.addOnGroups || []).forEach((group) => {
    if (group.required && group.options.length > 0) {
      initial[group.id] = [group.options[0]];
    } else {
      initial[group.id] = [];
    }
  });
  return initial;
}

export default function MenuCustomizerModal({ item, onClose, onConfirm }) {
  const [selection, setSelection] = useState(() => buildInitialSelection(item));
  const [note, setNote] = useState('');

  const selectedAddons = useMemo(
    () => Object.values(selection).flat(),
    [selection]
  );

  const handleToggle = (group, option) => {
    setSelection((current) => {
      const next = { ...current };
      const items = current[group.id] || [];
      const exists = items.some((entry) => entry.id === option.id);

      if (group.maxSelect === 1) {
        next[group.id] = exists ? [] : [option];
        return next;
      }

      next[group.id] = exists
        ? items.filter((entry) => entry.id !== option.id)
        : [...items, option].slice(0, group.maxSelect);

      return next;
    });
  };

  const handleSubmit = () => {
    const missingRequired = (item.addOnGroups || []).some((group) => group.required && (selection[group.id] || []).length === 0);
    if (missingRequired) {
      return;
    }
    onConfirm(selectedAddons, note);
  };

  return (
    <Modal title={`客製化 ${item.name}`} onClose={onClose}>
      <div className="grid gap-6">
        {(item.addOnGroups || []).map((group) => (
          <section key={group.id} className="soft-panel p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{group.name}</h3>
                <p className="text-sm text-slate-500">
                  {group.required ? '必選' : '可選'}，最多選 {group.maxSelect} 項
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {group.options.map((option) => {
                const active = (selection[group.id] || []).some((entry) => entry.id === option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleToggle(group, option)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{option.name}</span>
                      <span className="mono text-sm">{option.price > 0 ? `+${option.price}` : '免費'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <section className="soft-panel p-5">
          <label className="mb-2 block text-sm font-semibold text-slate-700">備註</label>
          <textarea
            className="field min-h-24 resize-none"
            placeholder="例如：切半、醬少一點"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </section>

        <div className="flex items-center justify-end gap-3">
          <button type="button" className="ghost-button" onClick={onClose}>
            取消
          </button>
          <button type="button" className="action-button" onClick={handleSubmit}>
            加入購物車
          </button>
        </div>
      </div>
    </Modal>
  );
}
