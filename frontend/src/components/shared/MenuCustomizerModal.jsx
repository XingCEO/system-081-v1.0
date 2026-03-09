import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from './Modal';

function buildInitialSelection(item) {
  return (item.addOnGroups || []).reduce((result, group) => {
    result[group.id] = group.required && group.options.length > 0 ? [group.options[0]] : [];
    return result;
  }, {});
}

export default function MenuCustomizerModal({ item, onClose, onConfirm }) {
  const [selection, setSelection] = useState(() => buildInitialSelection(item));
  const [note, setNote] = useState('');

  const selectedAddons = useMemo(() => Object.values(selection).flat(), [selection]);
  const addonTotal = useMemo(
    () => selectedAddons.reduce((sum, addon) => sum + Number(addon.price || 0), 0),
    [selectedAddons]
  );

  const toggleOption = (group, option) => {
    setSelection((current) => {
      const currentItems = current[group.id] || [];
      const exists = currentItems.some((entry) => entry.id === option.id);

      if (group.maxSelect === 1) {
        return {
          ...current,
          [group.id]: exists ? [] : [option]
        };
      }

      return {
        ...current,
        [group.id]: exists
          ? currentItems.filter((entry) => entry.id !== option.id)
          : [...currentItems, option].slice(0, group.maxSelect)
      };
    });
  };

  const handleConfirm = () => {
    const missingRequired = (item.addOnGroups || []).find((group) => group.required && (selection[group.id] || []).length === 0);
    if (missingRequired) {
      toast.error(`請先選擇「${missingRequired.name}」`);
      return;
    }

    onConfirm(selectedAddons, note.trim());
  };

  return (
    <Modal title={`客製 ${item.name}`} onClose={onClose}>
      <div className="grid gap-5">
        <section className="soft-panel p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="text-4xl">{item.emoji || '🍳'}</span>
              <div>
                <h3 className="text-xl font-black text-slate-900">{item.name}</h3>
                <p className="mt-1 text-sm leading-7 text-slate-500">
                  {item.description || '可在這裡選擇加料、甜度與備註。'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="mono text-sm text-slate-400">目前單價</div>
              <div className="mono text-2xl font-black text-brand-700">
                NT${Number(item.currentPrice ?? item.basePrice) + addonTotal}
              </div>
            </div>
          </div>
        </section>

        {(item.addOnGroups || []).map((group) => (
          <section key={group.id} className="soft-panel p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{group.name}</h3>
                <p className="text-sm text-slate-500">
                  {group.required ? '必選' : '可選'}，最多選 {group.maxSelect} 項
                </p>
              </div>
              {group.required && (
                <span className="pill border-amber-100 bg-amber-50 text-amber-700">必須至少選 1 項</span>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {group.options.map((option) => {
                const active = (selection[group.id] || []).some((entry) => entry.id === option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleOption(group, option)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{option.name}</span>
                      <span className="mono text-sm">{Number(option.price) > 0 ? `+${option.price}` : '免費'}</span>
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
            placeholder="例如：不要切、醬另外放、飲料少冰"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </section>

        <div className="flex items-center justify-end gap-3">
          <button type="button" className="ghost-button" onClick={onClose}>
            取消
          </button>
          <button type="button" className="action-button" onClick={handleConfirm}>
            加入購物車
          </button>
        </div>
      </div>
    </Modal>
  );
}
