/**
 * THEME MANAGER (TINTFIELD COMPATIBLE)
 * Handles live 12-step color scale injection, Tintfield CSS/JSON import & export,
 * preset switching, and local storage persistence.
 */

export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  neutral: Record<number, string>;
  brand: Record<number, string>;
}

export const PRESET_THEMES: Record<string, ThemeConfig> = {
  "warm-obsidian": {
    id: "warm-obsidian",
    name: "Warm Obsidian (Standard)",
    description: "Warme Sand- & Steintöne mit edlem Terrakotta-/Kupfer-Akzent",
    neutral: {
      1: "#faf9f7",
      2: "#f3f1ec",
      3: "#eae7df",
      4: "#e0dcd2",
      5: "#d4cfc2",
      6: "#c2bcad",
      7: "#948d7d",
      8: "#6e6757",
      9: "#474236",
      10: "#332f26",
      11: "#211e18",
      12: "#14120e",
    },
    brand: {
      1: "#fdf9f5",
      2: "#f9f0e6",
      3: "#f3dfcc",
      4: "#eccbb0",
      5: "#e3b591",
      6: "#d89c6f",
      7: "#ca814c",
      8: "#b6672f",
      9: "#c25e1a",
      10: "#aa4e11",
      11: "#823807",
      12: "#481d03",
    }
  },
  "slate-indigo": {
    id: "slate-indigo",
    name: "Slate Indigo",
    description: "Kühles Schiefergrau mit markantem Indigo-Akzent",
    neutral: {
      1: "#f8fafc",
      2: "#f1f5f9",
      3: "#e2e8f0",
      4: "#cbd5e1",
      5: "#94a3b8",
      6: "#64748b",
      7: "#475569",
      8: "#334155",
      9: "#1e293b",
      10: "#0f172a",
      11: "#0b1120",
      12: "#020617",
    },
    brand: {
      1: "#eef2ff",
      2: "#e0e7ff",
      3: "#c7d2fe",
      4: "#a5b4fc",
      5: "#818cf8",
      6: "#6366f1",
      7: "#4f46e5",
      8: "#4338ca",
      9: "#3730a3",
      10: "#312e81",
      11: "#1e1b4b",
      12: "#0f0e26",
    }
  },
  "forest-sage": {
    id: "forest-sage",
    name: "Forest Sage",
    description: "Organische erdige Naturtöne mit Salbei- & Waldgrün-Akzent",
    neutral: {
      1: "#fbfbfa",
      2: "#f4f4f2",
      3: "#e7e7e3",
      4: "#d9d9d3",
      5: "#c7c7bf",
      6: "#b0b0a5",
      7: "#8c8c7f",
      8: "#65655a",
      9: "#44443c",
      10: "#2d2d27",
      11: "#1b1b17",
      12: "#0e0e0c",
    },
    brand: {
      1: "#f2f8f4",
      2: "#e1efe5",
      3: "#c4e0cb",
      4: "#a2cfae",
      5: "#7cba8d",
      6: "#5aa36d",
      7: "#3f8952",
      8: "#2f6f40",
      9: "#235731",
      10: "#1a4425",
      11: "#123019",
      12: "#091c0e",
    }
  },
  "nordic-amber": {
    id: "nordic-amber",
    name: "Nordic Amber",
    description: "Reines skandinavisches Zink mit bernsteinfarbenem Goldakzent",
    neutral: {
      1: "#fafafa",
      2: "#f4f4f5",
      3: "#e4e4e7",
      4: "#d4d4d8",
      5: "#a1a1aa",
      6: "#71717a",
      7: "#52525b",
      8: "#3f3f46",
      9: "#27272a",
      10: "#18181b",
      11: "#0f0f11",
      12: "#09090b",
    },
    brand: {
      1: "#fffbeb",
      2: "#fef3c7",
      3: "#fde68a",
      4: "#fcd34d",
      5: "#fbbf24",
      6: "#f59e0b",
      7: "#d97706",
      8: "#b45309",
      9: "#92400e",
      10: "#78350f",
      11: "#451a03",
      12: "#260e02",
    }
  }
};

const STORAGE_KEY = "proman_active_theme";

class ThemeManager {
  private currentTheme: ThemeConfig;

  constructor() {
    this.currentTheme = this.loadStoredTheme() || PRESET_THEMES["warm-obsidian"];
  }

  public init(): void {
    this.applyTheme(this.currentTheme, false);
  }

  public getCurrentTheme(): ThemeConfig {
    return this.currentTheme;
  }

  public applyPreset(presetId: string): boolean {
    const preset = PRESET_THEMES[presetId];
    if (!preset) return false;
    this.currentTheme = preset;
    this.applyTheme(preset, true);
    return true;
  }

  public applyCustomTheme(theme: ThemeConfig): void {
    this.currentTheme = theme;
    this.applyTheme(theme, true);
  }

  public resetToDefault(): void {
    this.currentTheme = PRESET_THEMES["warm-obsidian"];
    localStorage.removeItem(STORAGE_KEY);
    this.applyTheme(this.currentTheme, true);
  }

  private applyTheme(theme: ThemeConfig, save: boolean): void {
    const root = document.documentElement;

    // Clean up any stale inline properties from root.style so dark mode CSS works!
    for (let i = 1; i <= 12; i++) {
      root.style.removeProperty(`--neutral-${i}`);
      root.style.removeProperty(`--brand-${i}`);
    }

    let styleEl = document.getElementById("proman-theme-override") as HTMLStyleElement | null;

    // If default warm-obsidian, tokens.css handles both light and dark mode natively!
    if (theme.id === "warm-obsidian") {
      if (styleEl) {
        styleEl.remove();
      }
      if (save) {
        localStorage.removeItem(STORAGE_KEY);
      }
      return;
    }

    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "proman-theme-override";
      document.head.appendChild(styleEl);
    }

    // Light mode rules (applied when not in dark mode)
    let css = `:root:not([data-theme="dark"]) {\n`;
    for (let i = 1; i <= 12; i++) {
      if (theme.neutral[i]) css += `  --neutral-${i}: ${theme.neutral[i]};\n`;
      if (theme.brand[i]) css += `  --brand-${i}: ${theme.brand[i]};\n`;
    }
    css += `}\n`;

    // Dark mode rules: invert neutral scale so high numbers remain text & low numbers remain canvas
    css += `:root[data-theme="dark"] {\n`;
    for (let i = 1; i <= 12; i++) {
      const darkNeutral = theme.neutral[13 - i] || theme.neutral[i];
      if (darkNeutral) css += `  --neutral-${i}: ${darkNeutral};\n`;
      if (theme.brand[i]) css += `  --brand-${i}: ${theme.brand[i]};\n`;
    }
    css += `}\n`;

    styleEl.textContent = css;

    if (save) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
      } catch (e) {
        console.warn("Could not save theme to localStorage:", e);
      }
    }
  }

  private loadStoredTheme(): ThemeConfig | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Parses Tintfield CSS variables (--neutral-X: #...; --brand-X: #...) or JSON
   */
  public parseTintfield(rawInput: string): ThemeConfig | null {
    const trimmed = rawInput.trim();
    if (!trimmed) return null;

    const neutral: Record<number, string> = { ...this.currentTheme.neutral };
    const brand: Record<number, string> = { ...this.currentTheme.brand };
    let hasFoundAny = false;

    // Check JSON first
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.neutral) {
          if (Array.isArray(parsed.neutral)) {
            parsed.neutral.forEach((val: string, idx: number) => {
              if (idx < 12 && val) {
                neutral[idx + 1] = val;
                hasFoundAny = true;
              }
            });
          } else if (typeof parsed.neutral === "object") {
            Object.entries(parsed.neutral).forEach(([k, v]) => {
              const num = parseInt(k, 10);
              if (num >= 1 && num <= 12 && typeof v === "string") {
                neutral[num] = v;
                hasFoundAny = true;
              }
            });
          }
        }
        if (parsed.brand) {
          if (Array.isArray(parsed.brand)) {
            parsed.brand.forEach((val: string, idx: number) => {
              if (idx < 12 && val) {
                brand[idx + 1] = val;
                hasFoundAny = true;
              }
            });
          } else if (typeof parsed.brand === "object") {
            Object.entries(parsed.brand).forEach(([k, v]) => {
              const num = parseInt(k, 10);
              if (num >= 1 && num <= 12 && typeof v === "string") {
                brand[num] = v;
                hasFoundAny = true;
              }
            });
          }
        }
      } catch {
        // Fall back to CSS regex parsing below
      }
    }

    if (!hasFoundAny) {
      // Regex parse CSS variables
      const neutralRegex = /--neutral-(\d+)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsl\([^)]+\))/g;
      const brandRegex = /--brand-(\d+)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsl\([^)]+\))/g;

      let match: RegExpExecArray | null;
      while ((match = neutralRegex.exec(trimmed)) !== null) {
        const step = parseInt(match[1], 10);
        if (step >= 1 && step <= 12) {
          neutral[step] = match[2];
          hasFoundAny = true;
        }
      }

      while ((match = brandRegex.exec(trimmed)) !== null) {
        const step = parseInt(match[1], 10);
        if (step >= 1 && step <= 12) {
          brand[step] = match[2];
          hasFoundAny = true;
        }
      }
    }

    if (!hasFoundAny) return null;

    return {
      id: "custom-" + Date.now(),
      name: "Benutzerdefiniertes Tintfield Theme",
      description: "Manuell importiert oder über Tintfield generiert",
      neutral,
      brand,
    };
  }

  /**
   * Generates formatted CSS export compatible with Tintfield and tokens.css
   */
  public exportCSS(theme: ThemeConfig = this.currentTheme): string {
    let css = `/* Tintfield 12-Step Scale Export - ${theme.name} */\n:root {\n  /* Neutrals (1: Canvas -> 12: High-Contrast Text) */\n`;
    for (let i = 1; i <= 12; i++) {
      css += `  --neutral-${i}: ${theme.neutral[i] || "#000000"};\n`;
    }
    css += `\n  /* Brand Accent (1: Subtle Tint -> 9: Solid Primary CTA -> 12: Dark Contrast) */\n`;
    for (let i = 1; i <= 12; i++) {
      css += `  --brand-${i}: ${theme.brand[i] || "#000000"};\n`;
    }
    css += `}\n`;
    return css;
  }
}

export const themeManager = new ThemeManager();
