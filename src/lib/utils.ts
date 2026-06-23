import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function onEnterPressed(handler: () => void) {
  return (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      handler();
    }
  };
}

export async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

declare global {
  interface Window {
    EluvioConfiguration: Record<string, unknown> & {
      version?: string;
      "config-url"?: string;
      availableContent?: Array<{
        title: string;
        versionHash: string;
        subHeader?: string;
      }>;
    };
    rootStore?: unknown;
    client?: unknown;
    player?: unknown;
  }

  // eslint-disable-next-line no-var
  var EluvioConfiguration: Window["EluvioConfiguration"];
}

export function getEluvioConfiguration() {
  if (typeof window.EluvioConfiguration === "undefined") {
    window.EluvioConfiguration = {};
  }

  return window.EluvioConfiguration;
}
