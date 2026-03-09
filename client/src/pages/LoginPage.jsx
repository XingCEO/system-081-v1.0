// 登入頁面 - PIN 碼數字鍵盤
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleKeyPress = useCallback((key) => {
    if (key === 'clear') {
      setPin('');
    } else if (key === 'back') {
      setPin(prev => prev.slice(0, -1));
    } else if (key === 'enter') {
      handleLogin();
    } else if (pin.length < 6) {
      setPin(prev => prev + key);
    }
  }, [pin]);

  const handleLogin = async () => {
    if (pin.length < 4) {
      toast.error('請輸入至少 4 位 PIN 碼');
      return;
    }

    try {
      const result = await login(pin);
      toast.success(`歡迎，${result.user.name}！`);
      navigate('/pos');
    } catch (err) {
      toast.error(err.message || 'PIN 碼錯誤');
      setPin('');
    }
  };

  // 如果輸入滿 4 位自動嘗試登入
  const handleKeyPressWithAutoLogin = useCallback((key) => {
    if (key === 'clear') {
      setPin('');
    } else if (key === 'back') {
      setPin(prev => prev.slice(0, -1));
    } else if (key === 'enter') {
      handleLogin();
    } else if (pin.length < 6) {
      const newPin = pin + key;
      setPin(newPin);
    }
  }, [pin]);

  const numpadKeys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['clear', '0', 'back']
  ];

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-pos-bg">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="text-6xl mb-4">🍽️</div>
        <h1 className="text-3xl font-bold text-pos-text">081 POS 系統</h1>
        <p className="text-pos-muted mt-2">請輸入 PIN 碼登入</p>
      </div>

      {/* PIN 顯示 */}
      <div className="flex gap-3 mb-8">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all duration-200 ${
              i < pin.length
                ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                : 'border-pos-accent/50 bg-pos-card'
            }`}
          >
            {i < pin.length ? '●' : ''}
          </div>
        ))}
      </div>

      {/* 數字鍵盤 */}
      <div className="grid grid-cols-3 gap-3 w-[300px]">
        {numpadKeys.flat().map((key) => (
          <button
            key={key}
            onClick={() => handleKeyPressWithAutoLogin(key)}
            disabled={isLoading}
            className={`numpad-key ${
              key === 'clear' ? 'text-pos-highlight text-base' :
              key === 'back' ? 'text-pos-warning text-base' :
              ''
            }`}
          >
            {key === 'clear' ? '清除' : key === 'back' ? '⌫' : key}
          </button>
        ))}
      </div>

      {/* 登入按鈕 */}
      <button
        onClick={handleLogin}
        disabled={pin.length < 4 || isLoading}
        className="mt-6 w-[300px] py-4 rounded-xl text-xl font-bold transition-all duration-200
                   bg-primary-600 hover:bg-primary-700 text-white
                   disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
      >
        {isLoading ? '登入中...' : '登入'}
      </button>

      {/* 快速入口 */}
      <div className="mt-8 flex gap-4">
        <button
          onClick={() => navigate('/call-screen')}
          className="px-4 py-2 text-sm text-pos-muted hover:text-pos-text transition-colors"
        >
          📢 叫號屏
        </button>
        <button
          onClick={() => navigate('/kiosk')}
          className="px-4 py-2 text-sm text-pos-muted hover:text-pos-text transition-colors"
        >
          🖥️ 自助點餐
        </button>
      </div>
    </div>
  );
}
