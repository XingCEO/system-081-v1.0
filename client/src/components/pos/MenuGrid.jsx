// 菜單品項格
import { motion } from 'framer-motion';

export default function MenuGrid({ items, isLoading, onItemClick }) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-pos-muted">載入中...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-pos-muted">此分類沒有品項</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {items.map((item) => (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onItemClick(item)}
            className="pos-card p-4 text-left hover:border-primary-500/50 transition-all group"
          >
            {/* 圖片 */}
            {item.image && (
              <div className="w-full h-24 rounded-lg overflow-hidden mb-2 bg-pos-accent/20">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
            )}

            {/* 品名 */}
            <div className="font-medium text-pos-text group-hover:text-primary-400 transition-colors">
              {item.name}
            </div>

            {/* 描述 */}
            {item.description && (
              <div className="text-xs text-pos-muted mt-1 line-clamp-1">
                {item.description}
              </div>
            )}

            {/* 價格 */}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-lg font-bold text-primary-400">
                ${item.currentPrice || item.basePrice}
              </span>
              {item.currentPrice && item.currentPrice !== item.basePrice && (
                <span className="text-xs text-pos-muted line-through">
                  ${item.basePrice}
                </span>
              )}
              {item.options && item.options.length > 0 && (
                <span className="text-xs bg-pos-accent/50 px-2 py-0.5 rounded text-pos-muted">
                  可選
                </span>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
