// 購物車側邊欄
import { useState } from 'react';
import { useCartStore } from '../../stores/cartStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function Cart({ onSubmit, recentOrders }) {
  const cart = useCartStore();
  const [activeTab, setActiveTab] = useState('cart'); // cart, orders

  const subtotal = cart.getSubtotal();
  const tax = cart.getTax();
  const total = cart.getTotal();

  return (
    <div className="w-[360px] flex flex-col bg-pos-card border-l border-pos-accent/30">
      {/* 標籤切換 */}
      <div className="flex border-b border-pos-accent/30">
        <button
          onClick={() => setActiveTab('cart')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'cart'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-pos-muted hover:text-pos-text'
          }`}
        >
          購物車 ({cart.getItemCount()})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'orders'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-pos-muted hover:text-pos-text'
          }`}
        >
          近期訂單
        </button>
      </div>

      {activeTab === 'cart' ? (
        <>
          {/* 購物車品項 */}
          <div className="flex-1 overflow-y-auto p-3">
            <AnimatePresence>
              {cart.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-pos-muted">
                  <span className="text-4xl mb-2">🛒</span>
                  <span>購物車是空的</span>
                </div>
              ) : (
                cart.items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="mb-2 p-3 bg-pos-bg/50 rounded-xl"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{item.name}</div>
                        {item.options.length > 0 && (
                          <div className="text-xs text-pos-muted mt-0.5">
                            {item.options.map(o => o.name).join(', ')}
                          </div>
                        )}
                        {item.note && (
                          <div className="text-xs text-pos-warning mt-0.5">📝 {item.note}</div>
                        )}
                      </div>
                      <div className="text-sm font-bold text-primary-400 ml-2">
                        ${item.totalPrice}
                      </div>
                    </div>

                    {/* 數量控制 */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-pos-muted">${item.unitPrice}/份</div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-lg bg-pos-accent/50 text-pos-text
                                     flex items-center justify-center active:scale-90 transition-transform"
                        >
                          {item.quantity === 1 ? '🗑' : '−'}
                        </button>
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <button
                          onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg bg-primary-600/50 text-pos-text
                                     flex items-center justify-center active:scale-90 transition-transform"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* 金額摘要 */}
          {cart.items.length > 0 && (
            <div className="p-4 border-t border-pos-accent/30">
              <div className="space-y-1 text-sm mb-3">
                <div className="flex justify-between text-pos-muted">
                  <span>小計</span>
                  <span>${subtotal}</span>
                </div>
                <div className="flex justify-between text-pos-muted">
                  <span>稅額 (5%)</span>
                  <span>${tax}</span>
                </div>
                {cart.discountAmount > 0 && (
                  <div className="flex justify-between text-pos-highlight">
                    <span>折扣</span>
                    <span>-${cart.discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-pos-accent/30">
                  <span>合計</span>
                  <span className="text-primary-400">${total}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => cart.clearCart()}
                  className="flex-1 py-3 rounded-xl bg-pos-accent/30 text-pos-muted
                             hover:text-pos-text active:scale-95 transition-all font-medium"
                >
                  清除
                </button>
                <button
                  onClick={onSubmit}
                  className="flex-[2] py-3 rounded-xl bg-primary-600 hover:bg-primary-700
                             text-white active:scale-95 transition-all font-bold text-lg"
                >
                  結帳 ${total}
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* 近期訂單 */
        <div className="flex-1 overflow-y-auto p-3">
          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-pos-muted">
              <span>今日尚無訂單</span>
            </div>
          ) : (
            recentOrders.map((order) => (
              <div key={order.id} className="mb-2 p-3 bg-pos-bg/50 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="font-bold">{order.orderNumber}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    order.status === 'completed' ? 'bg-pos-success/20 text-pos-success' :
                    order.status === 'ready' ? 'bg-pos-warning/20 text-pos-warning' :
                    order.status === 'preparing' ? 'bg-primary-500/20 text-primary-400' :
                    order.status === 'cancelled' ? 'bg-pos-highlight/20 text-pos-highlight' :
                    'bg-pos-accent/20 text-pos-muted'
                  }`}>
                    {order.status === 'pending' ? '待處理' :
                     order.status === 'preparing' ? '製作中' :
                     order.status === 'ready' ? '待取餐' :
                     order.status === 'completed' ? '已完成' :
                     order.status === 'cancelled' ? '已取消' : order.status}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1 text-sm">
                  <span className="text-pos-muted">
                    {order.type === 'dine_in' ? '內用' : order.type === 'takeout' ? '外帶' : '外送'}
                    {order.tableNumber && ` · ${order.tableNumber}`}
                  </span>
                  <span className="font-medium">${order.totalAmount}</span>
                </div>
                <div className="text-xs text-pos-muted mt-1">
                  {order.items?.map(i => `${i.name}×${i.quantity}`).join(', ')}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
