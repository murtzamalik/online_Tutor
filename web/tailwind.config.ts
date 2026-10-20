import type { Config } from "tailwindcss";
import tokens from "./src/styles/tokens.json";

const c = tokens.color;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Legacy names used across existing screens, remapped to the design system (§4.1).
        ink: c.ink,
        paper: c.paper,
        accent: c.accent,
        mist: c.mist,
        danger: c.danger,
        success: c.success,
        brand: c.brand,
        neutral: c.neutral,
        answer: c.answer,
        mastery: c.mastery,
        tier: c.tier,
      },
      fontFamily: {
        display: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: tokens.typography.scale as unknown as Record<string, [string, Record<string, string>]>,
      borderRadius: tokens.radius,
      boxShadow: tokens.elevation,
      transitionDuration: tokens.motion,
      maxWidth: { content: "720px", reading: "900px" },
    },
  },
  plugins: [],
};

export default config;
