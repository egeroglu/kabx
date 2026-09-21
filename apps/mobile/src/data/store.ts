import { useSyncExternalStore } from 'react';

import { WISHLIST, type WishItem } from './mock';

// Demo için bellek içi küçük bir store. Gerçek uygulamada TanStack Query + API.
type State = {
  wishlist: WishItem[];
  donated: string[];
  wornToday: boolean;
  likedLooks: string[];
};

let state: State = { wishlist: WISHLIST, donated: [], wornToday: false, likedLooks: [] };
const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => selector(state),
  );
}

export const actions = {
  likeLook(id: string, title: string, stage: string) {
    if (state.likedLooks.includes(id)) return;
    set({
      likedLooks: [...state.likedLooks, id],
      wishlist: [{ id: `look-${id}`, name: title, store: 'Keşfet’ten', price: '[Fiyat]', kind: 'bag', color: '#F0643A', stage }, ...state.wishlist],
    });
  },
  dropWish(id: string) {
    set({ wishlist: state.wishlist.filter((w) => w.id !== id) });
  },
  donate(id: string) {
    set({ donated: [...state.donated, id] });
  },
  markWorn() {
    set({ wornToday: true });
  },
};
