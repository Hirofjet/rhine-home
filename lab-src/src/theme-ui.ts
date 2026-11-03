import "./theme.css";

const palette = {
  ink: ["#080a08", "#e0e3dc"], muted: ["#77756d", "#a6b0b1"], line: ["#aaa59a", "#536166"],
  paper: ["#eae5e1", "#11181b"], panel: ["#edebe4", "#202a2f"], field: ["#e7e3d9", "#2a363b"],
  accent: ["#9b7247", "#c5a16b"],
} as const;

export type LabTheme = "light" | "dark" | "archive" | "sakura" | "noctis";
const STORAGE = "rhine-lab-theme";
const accents: Record<LabTheme, string> = {
  light: "#9b7247",
  dark: "#c5a16b",
  archive: "#4aa8f0",
  sakura: "#f26fa7",
  noctis: "#9a86ff",
};
let previous = -1;
let accentOverride = "";
let customPalette: [string, string, string] | null = null;
export let themeAmount = 0;

export function currentLabTheme(): LabTheme {
  try {
    const value = localStorage.getItem(STORAGE);
    if (value && value in accents) return value as LabTheme;
  } catch {
    /* ignore */
  }
  return "light";
}

export function setLabTheme(theme: LabTheme) {
  try {
    localStorage.setItem(STORAGE, theme);
  } catch {
    /* ignore */
  }
  accentOverride = accents[theme];
  customPalette = null;
  document.documentElement.dataset.labTheme = theme;
  previous = -1;
  paintTheme(theme === "dark" || theme === "noctis" ? 1 : 0);
}

function rgb(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

export function setLabCustomTheme(colors: [string, string, string]) {
  customPalette = colors;
  accentOverride = colors[1];
  document.documentElement.dataset.labTheme = "custom";
  previous = -2;
  paintTheme(0);
}

export function paintTheme(amount: number) {
  if (customPalette) {
    const root = document.documentElement;
    const [primary, secondary, tertiary] = customPalette;
    const luminance = (hex: string) => {
      const [r, g, b] = rgb(hex);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    };
    const dark = luminance(primary) < 0.45;
    const values: Record<string, string> = {
      paper: primary,
      panel: primary,
      field: primary,
      ink: dark ? "#f2eee5" : "#171512",
      muted: dark ? "#b8b2a6" : "#5b554c",
      line: secondary,
      accent: secondary,
    };
    root.dataset.darkSurface = String(dark);
    for (const [name, value] of Object.entries(values)) {
      const channels = rgb(value).join(", ");
      root.style.setProperty(`--theme-${name}`, `rgb(${channels})`);
      root.style.setProperty(`--theme-${name}-rgb`, channels);
    }
    root.style.setProperty("--theme-tertiary", tertiary);
    previous = amount;
    themeAmount = amount;
    return;
  }
  if (Math.abs(amount - previous) < 0.0001) return;
  previous = themeAmount = amount;
  const root = document.documentElement;
  root.dataset.darkSurface = String(amount > 0.0001);
  for (const [name, values] of Object.entries(palette)) {
    const from = rgb(values[0]), to = rgb(values[1]);
    const value = from.map((v, i) => Math.round(v + (to[i] - v) * amount)).join(", ");
    root.style.setProperty(`--theme-${name}`, `rgb(${value})`);
    root.style.setProperty(`--theme-${name}-rgb`, value);
  }
  if (accentOverride) {
    const accent = rgb(accentOverride).join(", ");
    root.style.setProperty("--theme-accent", `rgb(${accent})`);
    root.style.setProperty("--theme-accent-rgb", accent);
  }
}

export function themeSettingsMarkup(_dark: boolean) {
  const theme = currentLabTheme();
  return `<div class="theme-settings"><div><strong>主题切换</strong><span>选择整个实验室的色彩协议</span></div><select id="lab-theme-select" aria-label="主题切换" class="lab-theme-select">
    <option value="light"${theme === "light" ? " selected" : ""}>莱茵生命（亮）</option>
    <option value="dark"${theme === "dark" ? " selected" : ""}>莱茵生命（暗）</option>
    <option value="archive"${theme === "archive" ? " selected" : ""}>碧蓝档案</option>
    <option value="sakura"${theme === "sakura" ? " selected" : ""}>樱色协议</option>
    <option value="noctis"${theme === "noctis" ? " selected" : ""}>深空协议</option>
  </select></div>`;
}
