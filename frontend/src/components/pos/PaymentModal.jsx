// 付款彈窗
import { useState } from 'react';
import { useCartStore } from '../../stores/cartStore';

const paymentMethods = [
  { value: 'cash', label: '現金', icon: '💵' },
  { value: 'card', label: '刷卡', icon: '💳' },
  { value: 'line_pay', label: 'LINE Pay', icon: '💚' },
  { value: 'jko_pay', label: '街口支付', icon: '🟡' },
  { value: 'apple_pay', label: 'Apple Pay', icon: '🍎' },
];

const quickAmounts = [100, 500, 1000, 5000];

export default function PaymentModal({ onClose, onConfirm }) {
  const cart = useCartStore();
  const total = cart.getTotal();
  const [method, setMethod] = useState('cash');
  const [inputAmount, setInputAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const paidAmount = inputAmount ? parseFloat(inputAmount) : total;
  const change = Math.max(0, paidAmount - total);

  const handleNumpad = (key) => {
    if (key === 'clear') {
      setInputAmount('');
    } else if (key === 'back') {
      setInputAmount(prev => prev.slice(0, -1));
    } else if (key === '.') {
      if (!inputAmount.includes('.')) setInputAmount(prev => prev + '.');
    } else {
      setInputAmount(prev => prev + key);
    }
  };

  const handleConfirm = async () => {
    if (method === 'cash' && paidAmount < total) return;
    setIsProcessing(true);
    try {
      await onConfirm({
        method,
        amount: paidAmount,
        reference: method !== 'cash' ? `${method}-${Date.now()}` : null
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 只送出訂單不付款（先出餐）
  const handleOrderOnly = async () => {
    setIsProcessing(true);
    try {
      await onConfirm(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-pos-card w-[700px] max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden"
           onClick={e => e.stopPropagation()}>
        {/* 標題 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pos-accent/30">
          <h2 className="text-xl font-bold">結帳</h2>
          <button onClick={onClose} className="text-pos-muted hover:text-pos-text text-2xl">×</button>
        </div>

        <div className="flex">
          {/* 左側 - 付款方式 & 金額 */}
          <div className="flex-1 p-6">
            {/* 應付金額 */}
            <div className="text-center mb-6">
              <div className="text-pos-muted text-sm">應付金額</div>
              <div className="text-4xl font-bold text-primary-400">${total}</div>
            </div>

            {/* 付款方式 */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {paymentMethods.map((pm) => (
                <button
                  key={pm.value}
                  onClick={() => setMethod(pm.value)}
                  className={`p-3 rounded-xl text-center transition-all ${
                    method === pm.value
                      ? 'bg-primary-600 text-white ring-2 ring-primary-400'
                      : 'bg-pos-accent/30 text-pos-muted hover:text-pos-text'
                  }`}
                >
                  <div className="text-xl">{pm.icon}</div>
                  <div className="text-xs mt-1">{pm.label}</div>
                </button>
              ))}
            </div>

            {/* 現金收款 */}
            {method === 'cash' && (
              <>
                <div className="mb-3">
                  <input
                    type="text"
                    value={inputAmount}
                    readOnly
                    placeholder={`$${total}`}
                    className="pos-input text-center text-2xl font-bold"
                  />
                </div>

                {/* 快速金額 */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setInputAmount(String(amount))}
                      className="py-2 rounded-lg bg-pos-accent/30 text-pos-muted hover:text-pos-text
                                 hover:bg-pos-accent/50 transition-all text-sm font-medium"
                    >
                      ${amount}
                    </button>
                  ))}
                </div>

                {/* 找零 */}
                {inputAmount && (
                  <div className="text-center py-3 bg-pos-success/10 rounded-xl mb-3">
                    <div className="text-sm text-pos-muted">找零</div>
                    <div className={`text-2xl font-bold ${change >= 0 ? 'text-pos-success' : 'text-pos-highlight'}`}>
                      ${change}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 右側 - 數字鍵盤 */}
          {method === 'cash' && (
            <div className="w-[220px] p-4 border-l border-pos-accent/30">
              <div className="grid grid-cols-3 gap-2">
                {['7','8','9','4','5','6','1','2','3','.','0','back'].map((key) => (
                  <button
                    key={key}
                    onClick={() => handleNumpad(key)}
                    className="numpad-key text-lg"
                  >
                    {key === 'back' ? '⌫' : key}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setInputAmount('')}
                className="w-full mt-2 py-3 rounded-xl bg-pos-accent/30 text-pos-muted
                           hover:text-pos-text text-sm font-medium"
              >
                清除
              </button>
            </div>
          )}
        </div>

        {/* 底部按鈕 */}
        <div className="flex gap-3 p-4 border-t border-pos-accent/30">
          <button
            onClick={handleOrderOnly}
            disabled={isProcessing}
            className="flex-1 py-3 rounded-xl bg-pos-accent/30 text-pos-muted
                       hover:text-pos-text font-medium transition-all"
          >
            先出餐（稍後付款）
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing || (method === 'cash' && paidAmount < total)}
            className="flex-[2] py-3 rounded-xl bg-pos-success hover:brightness-110
                       text-white font-bold text-lg transition-all
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isProcessing ? '處理中...' : `確認收款 $${total}`}
          </button>
        </div>
      </div>
    </div>
  );
}
