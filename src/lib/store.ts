import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Category, Tier } from "@/data/places";

type State = {
  query: string;
  categories: Category[];
  tiers: Tier[];
  favorites: string[];
  route: string[];
  focusId: string | null;
  focusNonce: number;
  setQuery: (q: string) => void;
  toggleCategory: (c: Category) => void;
  clearCategories: () => void;
  toggleTier: (t: Tier) => void;
  toggleFavorite: (id: string) => void;
  addToRoute: (id: string) => void;
  removeFromRoute: (id: string) => void;
  clearRoute: () => void;
  setRoute: (ids: string[]) => void;
  moveRoute: (from: number, to: number) => void;
  focus: (id: string | null) => void;
};



export const useAppStore = create<State>()(
  persist(
    (set) => ({
      query: "",
      categories: [],
      tiers: ["geheimtipp", "touristisch"],
      favorites: [],
      route: [],
      focusId: null,
      focusNonce: 0,
      setQuery: (query) => set({ query }),
      toggleCategory: (c) =>
        set((s) => ({
          categories: s.categories.includes(c)
            ? s.categories.filter((x) => x !== c)
            : [...s.categories, c],
        })),
      clearCategories: () => set({ categories: [] }),
      toggleTier: (t) =>
        set((s) => ({
          tiers: s.tiers.includes(t) ? s.tiers.filter((x) => x !== t) : [...s.tiers, t],
        })),

      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((x) => x !== id)
            : [...s.favorites, id],
        })),
      addToRoute: (id) =>
        set((s) => (s.route.includes(id) ? s : { route: [...s.route, id] })),
      removeFromRoute: (id) =>
        set((s) => ({ route: s.route.filter((x) => x !== id) })),
      clearRoute: () => set({ route: [] }),
      setRoute: (ids) => set({ route: ids }),
      moveRoute: (from, to) =>
        set((s) => {
          if (from === to || from < 0 || to < 0 || from >= s.route.length || to >= s.route.length) return s;
          const next = s.route.slice();
          const [item] = next.splice(from, 1);
          next.splice(to, 0, item);
          return { route: next };
        }),
      focus: (focusId) => set((s) => ({ focusId, focusNonce: s.focusNonce + 1 })),
    }),
    {
      name: "steder-i-norge",
      partialize: (s) => ({ favorites: s.favorites, route: s.route }),
    },
  ),
);
