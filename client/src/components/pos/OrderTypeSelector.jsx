// 訂單類型選擇器
import { useCartStore } from '../../stores/cartStore';

const types = [
  { value: 'dine_in', label: '內用', icon: '🪑' },
  { value: 'takeout', label: '外帶', icon: '🥡' },
  { value: 'delivery', label: '外送', icon: '🛵' }
];

export default function OrderTypeSelector() {
  const { orderType, setOrderInfo } = useCartStore();

  return (
    <div className="flex gap-1 bg-pos-accent/20 rounded-lg p-1">
      {types.map((type) => (
        <button
          key={type.value}
          onClick={() => setOrderInfo({ orderType: type.value })}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
            orderType === type.value
              ? 'bg-primary-600 text-white'
              : 'text-pos-muted hover:text-pos-text'
          }`}
        >
          {type.icon} {type.label}
        </button>
      ))}
    </div>
  );
}
