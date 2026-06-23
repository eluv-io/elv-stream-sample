import { Palette } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRAND_THEMES } from "@/lib/themes";
import { useThemeStore } from "@/stores/useThemeStore";

interface ThemeSelectorProps {
  compact?: boolean;
}

export function ThemeSelector({ compact = false }: ThemeSelectorProps) {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <div
      className={`flex items-center gap-2 ${compact ? "" : "rounded-md border bg-card p-2"}`}
    >
      {!compact ? <Palette className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}

      <Select value={theme} onValueChange={setTheme}>
        <SelectTrigger className={compact ? "h-8 w-[160px]" : "h-8 w-[180px]"}>
          <SelectValue placeholder="Theme" />
        </SelectTrigger>
        <SelectContent>
          {BRAND_THEMES.map((brandTheme) => (
            <SelectItem key={brandTheme.id} value={brandTheme.id}>
              {brandTheme.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
