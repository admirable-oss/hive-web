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

export const THEMES: Theme[] = [
  {
    name: "catppuccin",
    fg: "#cdd6f4", bg: "#181825", muted: "#7f849c", border: "#45475a", accent: "#f9e2af", selection: "#45475a",
    success: "#a6e3a1", warning: "#fab387", error: "#f38ba8", info: "#89b4fa",
    term: "#1e1e2e",
    ansi: { fg: "#cdd6f4", dim: "#7f849c", red: "#f38ba8", green: "#a6e3a1", yellow: "#f9e2af", blue: "#89b4fa", magenta: "#cba6f7", cyan: "#94e2d5", orange: "#fab387" },
  },
  {
    name: "tokyo-night",
    fg: "#c0caf5", bg: "#16161e", muted: "#565f89", border: "#3b4261", accent: "#7aa2f7", selection: "#283457",
    success: "#9ece6a", warning: "#e0af68", error: "#f7768e", info: "#7dcfff",
    term: "#1a1b26",
    ansi: { fg: "#c0caf5", dim: "#565f89", red: "#f7768e", green: "#9ece6a", yellow: "#e0af68", blue: "#7aa2f7", magenta: "#bb9af7", cyan: "#7dcfff", orange: "#ff9e64" },
  },
  {
    name: "gruvbox",
    fg: "#ebdbb2", bg: "#1d2021", muted: "#928374", border: "#504945", accent: "#fabd2f", selection: "#504945",
    success: "#b8bb26", warning: "#fe8019", error: "#fb4934", info: "#83a598",
    term: "#282828",
    ansi: { fg: "#ebdbb2", dim: "#928374", red: "#fb4934", green: "#b8bb26", yellow: "#fabd2f", blue: "#83a598", magenta: "#d3869b", cyan: "#8ec07c", orange: "#fe8019" },
  },
  {
    name: "nord",
    fg: "#eceff4", bg: "#2e3440", muted: "#7b88a1", border: "#4c566a", accent: "#88c0d0", selection: "#434c5e",
    success: "#a3be8c", warning: "#ebcb8b", error: "#bf616a", info: "#81a1c1",
    term: "#242933",
    ansi: { fg: "#eceff4", dim: "#7b88a1", red: "#bf616a", green: "#a3be8c", yellow: "#ebcb8b", blue: "#81a1c1", magenta: "#b48ead", cyan: "#88c0d0", orange: "#d08770" },
  },
];
