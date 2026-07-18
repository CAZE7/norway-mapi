import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Category } from "@/data/places";

type State = {
  query: string;
  categories: Category[];
  favorites: string[];
  route: string[];
  focusId: string | null;
  focusNonce: number;
  setQuery: (q: string) => void;
  toggleCategory: (c: Category) => void;
  clearCategories: () => void;
  toggleFavorite: (id: string) => void;
  addToRoute: (id: string) => void;
  removeFromRoute: (id: string) => void;
  clearRoute: () => void;
  focus: (id: string | null) => void;
};

export const useAppStore = create<State>()(
  persist(
    (set) => ({
      query: "",
      categories: [],
      favorites: [],
      route: [],
      focusId: null,
      setQuery: (query) => set({ query }),
      toggleCategory: (c) =>
        set((s) => ({
          categories: s.categories.includes(c)
            ? s.categories.filter((x) => x !== c)
            : [...s.categories, c],
        })),
      clearCategories: () => set({ categories: [] }),
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
      focus: (focusId) => set({ focusId }),
    }),
    {
      name: "steder-i-norge",
      partialize: (s) => ({ favorites: s.favorites, route: s.route }),
    },
  ),
);
