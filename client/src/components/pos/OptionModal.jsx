// 品項選項選擇彈窗
import { useState } from 'react';

export default function OptionModal({ item, onClose, onConfirm }) {
  const [selections, setSelections] = useState({});
  const [note, setNote] = useState('');

  // 初始化預設選項
  useState(() => {
    const defaults = {};
    for (const option of item.options) {
      if (option.type === 'single') {
        const defaultChoice = option.choices.find(c => c.isDefault) || option.choices[0];
        if (defaultChoice) defaults[option.id] = [defaultChoice];
      } else {
        defaults[option.id] = option.choices.filter(c => c.isDefault);
      }
    }
    setSelections(defaults);
  });

  const handleChoiceClick = (option, choice) => {
    setSelections(prev => {
      const current = prev[option.id] || [];

      if (option.type === 'single') {
        return { ...prev, [option.id]: [choice] };
      } else {
        // 多選
        const exists = current.find(c => c.id === choice.id);
        if (exists) {
          return { ...prev, [option.id]: current.filter(c => c.id !== choice.id) };
        } else if (current.length < option.maxSelect) {
          return { ...prev, [option.id]: [...current, choice] };
        }
        return prev;
      }
    });
  };

  const isSelected = (optionId, choiceId) => {
    return (selections[optionId] || []).some(c => c.id === choiceId);
  };

  const handleConfirm = () => {
    // 驗證必選
    for (const option of item.options) {
      if (option.isRequired && (!selections[option.id] || selections[option.id].length === 0)) {
        return; // 可以加提示
      }
    }

    // 收集所有選擇
    const allOptions = Object.values(selections).flat().map(c => ({
      name: c.name,
      priceAdjust: c.priceAdjust || 0
    }));

    onConfirm(item, allOptions, note);
  };

  // 計算加價
  const totalAdjust = Object.values(selections)
    .flat()
    .reduce((sum, c) => sum + (c.priceAdjust || 0), 0);

  const finalPrice = (item.currentPrice || item.basePrice) + totalAdjust;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-pos-card w-[500px] max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden"
           onClick={e => e.stopPropagation()}>
        {/* 標題 */}
        <div className="px-6 py-4 border-b border-pos-accent/30">
          <h2 className="text-xl font-bold">{item.name}</h2>
          {item.description && (
            <p className="text-sm text-pos-muted mt-1">{item.description}</p>
          )}
        </div>

        {/* 選項列表 */}
        <div className="max-h-[50vh] overflow-y-auto p-6 space-y-6">
          {item.options.map((option) => (
            <div key={option.id}>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-medium">{option.name}</span>
                {option.isRequired && (
                  <span className="text-xs bg-pos-highlight/20 text-pos-highlight px-2 py-0.5 rounded">必選</span>
                )}
                {option.type === 'multiple' && (
                  <span className="text-xs text-pos-muted">（最多選 {option.maxSelect} 項）</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {option.choices.map((choice) => (
                  <button
                    key={choice.id}
                    onClick={() => handleChoiceClick(option, choice)}
                    className={`p-3 rounded-xl text-left transition-all ${
                      isSelected(option.id, choice.id)
                        ? 'bg-primary-600 text-white ring-2 ring-primary-400'
                        : 'bg-pos-accent/30 text-pos-muted hover:text-pos-text'
                    }`}
                  >
                    <div className="font-medium text-sm">{choice.name}</div>
                    {choice.priceAdjust > 0 && (
                      <div className="text-xs mt-0.5 opacity-75">+${choice.priceAdjust}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* 備註 */}
          <div>
            <div className="font-medium mb-2">備註</div>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="例：不要辣、少油..."
              className="pos-input"
            />
          </div>
        </div>

        {/* 底部 */}
        <div className="flex gap-3 p-4 border-t border-pos-accent/30">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-pos-accent/30 text-pos-muted font-medium"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="flex-[2] py-3 rounded-xl bg-primary-600 hover:bg-primary-700
                       text-white font-bold text-lg transition-all"
          >
            加入 ${finalPrice}
          </button>
        </div>
      </div>
    </div>
  );
}
