/**
 * The TUI's colour schemes, copied from hive's internal/tui/theme. A theme
 * colours the chrome (sidebar, tab bar, borders, boxes); `term` and `ansi`
 * stand in for the terminal the panes' programs draw on.
 */
export interface Theme {
  name: string;
  fg: string;
  bg: string;
  muted: string;
  border: string;
  accent: string;
  selection: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  /** The terminal's own background, under the panes. */
  term: string;
  ansi: Record<Color, string>;
}

/** Colours programs print in (the terminal's palette). */
export type Color = "fg" | "dim" | "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "orange";

/** Default landing-site palette: graphite shell, bone text, honey accents. */
export const HIVE_THEME: Theme = {
  name: "hive",
  fg: "#EDEAE3",
  bg: "#121211",
  muted: "#77736A",
  border: "#2A2926",
  accent: "#F5B942",
  selection: "#2B2618",
  success: "#9CC08A",
  warning: "#F5B942",
  error: "#E08A7A",
  info: "#DE9C30",
  term: "#1C1C1A",
  ansi: {
    fg: "#EDEAE3",
    dim: "#77736A",
    red: "#E08A7A",
    green: "#9CC08A",
    yellow: "#FFD58A",
    blue: "#DE9C30",
    magenta: "#8F8B82",
    cyan: "#B5B1A8",
    orange: "#F5B942",
  },
};

export const THEMES: Theme[] = [HIVE_THEME];
