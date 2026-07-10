import type { Config } from "tailwindcss";

/**
 * Integração Tailwind ↔ design tokens.
 * Todos os valores referenciam variáveis CSS de `src/styles/tokens.css` —
 * nenhum hex duplicado aqui. Ver DESIGN.md.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--color-canvas)",
        surface: {
          DEFAULT: "var(--color-surface)",
          hover: "var(--color-surface-hover)",
          active: "var(--color-surface-active)",
          raised: "var(--color-surface-raised)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)",
          active: "var(--color-accent-active)",
          subtle: "var(--color-accent-subtle)",
        },
        forest: "var(--color-deep-forest)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        info: "var(--color-info)",
        xp: "var(--color-xp)",
        level: "var(--color-level)",
        streak: "var(--color-streak)",
        // aliases legados usados por classes existentes
        "bg-base": "var(--color-canvas)",
        "bg-elevated": "var(--color-surface)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-muted": "var(--color-text-muted)",
      },
      textColor: {
        primary: "var(--color-text-primary)",
        secondary: "var(--color-text-secondary)",
        muted: "var(--color-text-muted)",
        "on-accent": "var(--color-text-on-accent)",
      },
      borderColor: {
        subtle: "var(--color-border-subtle)",
        DEFAULT: "var(--color-border-default)",
        strong: "var(--color-border-strong)",
      },
      fontFamily: {
        sans: ["var(--font-ui)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: {
        control: "var(--radius-control)",
        card: "var(--radius-card)",
        "card-lg": "var(--radius-card-lg)",
        modal: "var(--radius-modal)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        modal: "var(--shadow-modal)",
        drawer: "var(--shadow-drawer)",
        focus: "var(--shadow-focus)",
      },
      spacing: {
        sidebar: "var(--sidebar-width)",
        "mobile-header": "var(--mobile-header-height)",
      },
      maxWidth: {
        content: "var(--content-max-width)",
        "content-wide": "var(--content-max-width-wide)",
      },
    },
  },
  plugins: [],
};
export default config;
