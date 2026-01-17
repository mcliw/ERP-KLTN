import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  id: number;
  name: string;
  brand: string;
  price: number;
  discount: number;
  image: string;
  specs: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, change: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        const currentItems = get().items;
        const existingItem = currentItems.find((item) => item.id === product.id);

        if (existingItem) {
          // Nếu đã có -> Tăng số lượng
          set({
            items: currentItems.map((item) =>
              item.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          });
        } else {
          // Nếu chưa có -> Thêm mới
          set({ items: [...currentItems, { ...product, quantity: 1 }] });
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((item) => item.id !== id) });
      },

      updateQuantity: (id, change) => {
        const newItems = get().items.map((item) => {
            if (item.id === id) {
                const newQuantity = item.quantity + change;
                return { ...item, quantity: Math.max(1, newQuantity) };
            }
            return item;
        });
        set({ items: newItems });
      },

      clearCart: () => set({ items: [] }),

      getTotalPrice: () => {
          return get().items.reduce((total, item) => {
              const realPrice = item.price * (1 - item.discount / 100);
              return total + realPrice * item.quantity;
          }, 0);
      }
    }),
    {
      name: 'cart-storage', // Tên key trong LocalStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
);