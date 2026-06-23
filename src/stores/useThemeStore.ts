import { create } from "zustand";
import { persist } from "zustand/middleware";

import { applyBrandTheme, DEFAULT_THEME } from "@/lib/themes";

interface ThemeState {
  theme: string;
  setTheme: (theme: string) => void;
  initialize: () => void;
}

interface LegacyThemeState {
  theme?: string;
  colorTheme?: string;
  fontTheme?: string;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: DEFAULT_THEME,

      setTheme: (theme) => {
        applyBrandTheme(theme);
        set({ theme });
      },

      initialize: () => {
        applyBrandTheme(get().theme);
      },
    }),
    {
      name: "elv-stream-theme",
      version: 1,
      migrate: (persisted) => {
        const state = persisted as LegacyThemeState;
        return {
          theme: state.theme ?? state.colorTheme ?? DEFAULT_THEME,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyBrandTheme(state.theme);
        }
      },
    },
  ),
);
