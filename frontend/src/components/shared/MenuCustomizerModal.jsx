import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from './Modal';

function buildInitialAddOnSelection(item) {
  return (item.addOnGroups || []).reduce((result, group) => {
    result[group.id] = group.required && group.options.length > 0 ? [group.options[0]] : [];
    return result;
  }, {});
}

function buildInitialComboSelection(item) {
  return (item.comboGroups || []).reduce((result, group) => {
    const firstAvailable = (group.options || []).find((option) => option.available !== false);
    result[group.name] = group.required && firstAvailable ? [firstAvailable] : [];
    return result;
  }, {});
}

function calculateTotal(basePrice, addOns, comboSelections) {
  const addOnTotal = addOns.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const comboTotal = comboSelections.reduce((sum, item) => sum + Number(item.price || 0), 0);
  return Number(basePrice || 0) + addOnTotal + comboTotal;
}

export default function MenuCustomizerModal({ item, onClose, onConfirm }) {
  const [addOnSelection, setAddOnSelection] = useState(() => buildInitialAddOnSelection(item));
  const [comboSelection, setComboSelection] = useState(() => buildInitialComboSelection(item));
  const [note, setNote] = useState('');

  const selectedAddons = useMemo(
    () => Object.values(addOnSelection).flat(),
    [addOnSelection]
  );
  const selectedCombos = useMemo(
    () => Object.values(comboSelection).flat(),
    [comboSelection]
  );

  const totalPrice = useMemo(
    () => calculateTotal(item.currentPrice ?? item.basePrice, selectedAddons, selectedCombos),
    [item.basePrice, item.currentPrice, selectedAddons, selectedCombos]
  );

  const toggleGroupOption = (group, option, currentSelection, setSelection, key) => {
    setSelection((current) => {
      const currentItems = current[key] || [];
      const exists = currentItems.some((entry) => String(entry.id || entry.menuItemId || entry.name) === String(option.id || option.menuItemId || option.name));

      if (group.maxSelect === 1) {
        return {
          ...current,
          [key]: exists ? [] : [option]
        };
      }

      return {
        ...current,
        [key]: exists
          ? currentItems.filter((entry) => String(entry.id || entry.menuItemId || entry.name) !== String(option.id || option.menuItemId || option.name))
          : [...currentItems, option].slice(0, group.maxSelect)
      };
    });
  };

  const validateRequiredSelections = () => {
    const missingAddOnGroup = (item.addOnGroups || []).find(
      (group) => group.required && (addOnSelection[group.id] || []).length === 0
    );
    if (missingAddOnGroup) {
      toast.error(`請先選擇「${missingAddOnGroup.name}」`);
      return false;
    }

    const missingComboGroup = (item.comboGroups || []).find(
      (group) => group.required && (comboSelection[group.name] || []).length === 0
    );
    if (missingComboGroup) {
      toast.error(`請先完成套餐內容「${missingComboGroup.name}」`);
      return false;
    }

    return true;
  };

  const handleConfirm = () => {
    if (!validateRequiredSelections()) {
      return;
    }

    const normalizedComboSelections = selectedCombos.map((entry) => ({
      groupName: entry.groupName,
      menuItemId: entry.menuItemId,
      externalCode: entry.externalCode || null,
      name: entry.name,
      emoji: entry.emoji || null,
      price: Number(entry.price || 0)
    }));

    onConfirm(selectedAddons, note.trim(), normalizedComboSelections);
  };

  return (
    <Modal title={`設定品項：${item.name}`} onClose={onClose} wide>
      <div className="grid gap-5">
        <section className="soft-panel p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="text-4xl">{item.emoji || '🍳'}</span>
              <div>
                <h3 className="text-xl font-black text-slate-900">{item.name}</h3>
                <p className="mt-1 text-sm leading-7 text-slate-500">
                  {item.description || '可自訂加料、套餐搭配與備註。'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="mono text-sm text-slate-400">目前單價</div>
              <div className="mono text-2xl font-black text-brand-700">NT${totalPrice}</div>
            </div>
          </div>
        </section>

        {(item.comboGroups || []).map((group) => (
          <section key={group.name} className="soft-panel p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{group.name}</h3>
                <p className="text-sm text-slate-500">
                  {group.required ? '必選' : '可選'}，最多選 {group.maxSelect} 項
                </p>
              </div>
              {group.required && (
                <span className="pill border-amber-100 bg-amber-50 text-amber-700">套餐必選</span>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {(group.options || []).map((option) => {
                const active = (comboSelection[group.name] || []).some(
                  (entry) => String(entry.menuItemId || entry.name) === String(option.menuItemId || option.name)
                );

                return (
                  <button
                    key={`${group.name}-${option.menuItemId || option.name}`}
                    type="button"
                    disabled={option.available === false}
                    onClick={() => toggleGroupOption(
                      group,
                      {
                        ...option,
                        groupName: group.name,
                        price: Number(option.priceAdjust ?? option.price ?? 0)
                      },
                      comboSelection,
                      setComboSelection,
                      group.name
                    )}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200'
                    } ${option.available === false ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">
                        {option.emoji ? `${option.emoji} ` : ''}
                        {option.name}
                      </span>
                      <span className="mono text-sm">
                        {Number(option.priceAdjust ?? option.price ?? 0) > 0
                          ? `+${Number(option.priceAdjust ?? option.price ?? 0)}`
                          : '免費'}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {option.available === false ? '目前售完' : `剩餘庫存 ${option.stock ?? 0}`}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

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
                <span className="pill border-amber-100 bg-amber-50 text-amber-700">請至少選 1 項</span>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {group.options.map((option) => {
                const active = (addOnSelection[group.id] || []).some((entry) => entry.id === option.id);

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleGroupOption(group, option, addOnSelection, setAddOnSelection, group.id)}
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
            placeholder="例如：切半、不要洋蔥、外帶醬料分開放。"
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
