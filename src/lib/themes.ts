export interface ThemeVariables {
  background: string;
  foreground: string;
  card: string;
  "card-foreground": string;
  popover: string;
  "popover-foreground": string;
  primary: string;
  "primary-foreground": string;
  secondary: string;
  "secondary-foreground": string;
  muted: string;
  "muted-foreground": string;
  accent: string;
  "accent-foreground": string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  "segment-duration": string;
  "segment-latency": string;
  "segment-download": string;
}

export interface BrandTheme {
  id: string;
  name: string;
  fontFamily: string;
  variables: ThemeVariables;
}

export const BRAND_THEMES: BrandTheme[] = [
  {
    id: "default",
    name: "Eluvio Blue",
    fontFamily: 'Inter, "Helvetica Neue", helvetica, sans-serif',
    variables: {
      background: "#ffffff",
      foreground: "#1a1a1a",
      card: "#ffffff",
      "card-foreground": "#1a1a1a",
      popover: "#ffffff",
      "popover-foreground": "#1a1a1a",
      primary: "#1b73e8",
      "primary-foreground": "#ffffff",
      secondary: "#f3f4f6",
      "secondary-foreground": "#374151",
      muted: "#f3f4f6",
      "muted-foreground": "#6b7280",
      accent: "#f3f4f6",
      "accent-foreground": "#374151",
      destructive: "#dc2626",
      border: "#e5e7eb",
      input: "#e5e7eb",
      ring: "#1b73e8",
      "segment-duration": "#93c5fd",
      "segment-latency": "#fca5a5",
      "segment-download": "#86efac",
    },
  },
  {
    id: "dark",
    name: "Dark",
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    variables: {
      background: "#0f1117",
      foreground: "#f3f4f6",
      card: "#181b24",
      "card-foreground": "#f3f4f6",
      popover: "#181b24",
      "popover-foreground": "#f3f4f6",
      primary: "#60a5fa",
      "primary-foreground": "#0f1117",
      secondary: "#252936",
      "secondary-foreground": "#e5e7eb",
      muted: "#252936",
      "muted-foreground": "#9ca3af",
      accent: "#2d3344",
      "accent-foreground": "#f3f4f6",
      destructive: "#f87171",
      border: "#2d3344",
      input: "#2d3344",
      ring: "#60a5fa",
      "segment-duration": "#3b82f6",
      "segment-latency": "#ef4444",
      "segment-download": "#22c55e",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    fontFamily: "Outfit, Inter, sans-serif",
    variables: {
      background: "#f0fdfa",
      foreground: "#134e4a",
      card: "#ffffff",
      "card-foreground": "#134e4a",
      popover: "#ffffff",
      "popover-foreground": "#134e4a",
      primary: "#0d9488",
      "primary-foreground": "#ffffff",
      secondary: "#ccfbf1",
      "secondary-foreground": "#115e59",
      muted: "#ccfbf1",
      "muted-foreground": "#5eead4",
      accent: "#99f6e4",
      "accent-foreground": "#134e4a",
      destructive: "#dc2626",
      border: "#99f6e4",
      input: "#99f6e4",
      ring: "#0d9488",
      "segment-duration": "#5eead4",
      "segment-latency": "#fb7185",
      "segment-download": "#6ee7b7",
    },
  },
  {
    id: "violet",
    name: "Violet",
    fontFamily: "Outfit, Inter, sans-serif",
    variables: {
      background: "#faf5ff",
      foreground: "#3b0764",
      card: "#ffffff",
      "card-foreground": "#3b0764",
      popover: "#ffffff",
      "popover-foreground": "#3b0764",
      primary: "#7c3aed",
      "primary-foreground": "#ffffff",
      secondary: "#ede9fe",
      "secondary-foreground": "#5b21b6",
      muted: "#ede9fe",
      "muted-foreground": "#8b5cf6",
      accent: "#ddd6fe",
      "accent-foreground": "#3b0764",
      destructive: "#dc2626",
      border: "#ddd6fe",
      input: "#ddd6fe",
      ring: "#7c3aed",
      "segment-duration": "#c4b5fd",
      "segment-latency": "#f9a8d4",
      "segment-download": "#a7f3d0",
    },
  },
  {
    id: "forest",
    name: "Forest",
    fontFamily: "Lora, Georgia, serif",
    variables: {
      background: "#f6faf3",
      foreground: "#1a2e1a",
      card: "#ffffff",
      "card-foreground": "#1a2e1a",
      popover: "#ffffff",
      "popover-foreground": "#1a2e1a",
      primary: "#2d6a4f",
      "primary-foreground": "#ffffff",
      secondary: "#d8f3dc",
      "secondary-foreground": "#1b4332",
      muted: "#d8f3dc",
      "muted-foreground": "#52b788",
      accent: "#b7e4c7",
      "accent-foreground": "#1a2e1a",
      destructive: "#dc2626",
      border: "#b7e4c7",
      input: "#b7e4c7",
      ring: "#2d6a4f",
      "segment-duration": "#95d5b2",
      "segment-latency": "#e76f51",
      "segment-download": "#74c69d",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    fontFamily: "Outfit, Inter, sans-serif",
    variables: {
      background: "#fffbf5",
      foreground: "#431407",
      card: "#ffffff",
      "card-foreground": "#431407",
      popover: "#ffffff",
      "popover-foreground": "#431407",
      primary: "#ea580c",
      "primary-foreground": "#ffffff",
      secondary: "#ffedd5",
      "secondary-foreground": "#9a3412",
      muted: "#ffedd5",
      "muted-foreground": "#fb923c",
      accent: "#fed7aa",
      "accent-foreground": "#431407",
      destructive: "#dc2626",
      border: "#fed7aa",
      input: "#fed7aa",
      ring: "#ea580c",
      "segment-duration": "#fdba74",
      "segment-latency": "#f87171",
      "segment-download": "#fcd34d",
    },
  },
  {
    id: "marquee",
    name: "Marquee",
    fontFamily: '"Barlow", Inter, sans-serif',
    variables: {
      background: "#0b0b0b",
      foreground: "#f5f5f5",
      card: "#141414",
      "card-foreground": "#f5f5f5",
      popover: "#1a1a1a",
      "popover-foreground": "#f5f5f5",
      primary: "#ce1141",
      "primary-foreground": "#ffffff",
      secondary: "#222222",
      "secondary-foreground": "#e5e5e5",
      muted: "#1a1a1a",
      "muted-foreground": "#9ca3af",
      accent: "#3a1522",
      "accent-foreground": "#fecdd3",
      destructive: "#ef4444",
      border: "#2a2a2a",
      input: "#2a2a2a",
      ring: "#ce1141",
      "segment-duration": "#ce1141",
      "segment-latency": "#7f1d1d",
      "segment-download": "#fca5a5",
    },
  },
  {
    id: "masn",
    name: "MASN+",
    fontFamily: '"Encode Sans Expanded", "Barlow", Inter, sans-serif',
    variables: {
      background: "#000000",
      foreground: "#ffffff",
      card: "#0f0f0f",
      "card-foreground": "#ffffff",
      popover: "#141414",
      "popover-foreground": "#ffffff",
      primary: "#df4601",
      "primary-foreground": "#ffffff",
      secondary: "#1a1a1a",
      "secondary-foreground": "#f5f5f5",
      muted: "#171717",
      "muted-foreground": "#a1a1aa",
      accent: "#3d1f00",
      "accent-foreground": "#ffedd5",
      destructive: "#ef4444",
      border: "#262626",
      input: "#262626",
      ring: "#df4601",
      "segment-duration": "#df4601",
      "segment-latency": "#44403c",
      "segment-download": "#fb923c",
    },
  },
  {
    id: "gotham",
    name: "Gotham Sports",
    fontFamily: '"Montserrat", Inter, sans-serif',
    variables: {
      background: "#0a0e14",
      foreground: "#f1f5f9",
      card: "#111827",
      "card-foreground": "#f1f5f9",
      popover: "#151c28",
      "popover-foreground": "#f1f5f9",
      primary: "#d4af37",
      "primary-foreground": "#0a0e14",
      secondary: "#1a2332",
      "secondary-foreground": "#e2e8f0",
      muted: "#151b26",
      "muted-foreground": "#94a3b8",
      accent: "#3d3417",
      "accent-foreground": "#fde68a",
      destructive: "#e4002c",
      border: "#1e293b",
      input: "#1e293b",
      ring: "#d4af37",
      "segment-duration": "#d4af37",
      "segment-latency": "#475569",
      "segment-download": "#60a5fa",
    },
  },
];

export const DEFAULT_THEME = "default";

export function getBrandTheme(id: string) {
  return BRAND_THEMES.find((theme) => theme.id === id) ?? BRAND_THEMES[0];
}

export function applyBrandTheme(id: string) {
  const theme = getBrandTheme(id);
  const root = document.documentElement;

  Object.entries(theme.variables).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });

  root.style.setProperty("--font-sans", theme.fontFamily);
  root.dataset.theme = id;
}

export function getPrimaryColor() {
  return getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
}
