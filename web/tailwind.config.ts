import type { Config } from "tailwindcss";
import tokens from "./src/styles/tokens.json";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: tokens.color.ink,
        paper: tokens.color.paper,
        accent: tokens.color.accent,
        mist: tokens.color.mist,
        danger: tokens.color.danger,
        success: tokens.color.success,
      },
      fontFamily: {
        display: [tokens.typography.display, "Georgia", "serif"],
        body: [tokens.typography.body, "Segoe UI", "sans-serif"],
      },
      borderRadius: tokens.radius,
      boxShadow: tokens.elevation,
    },
  },
  plugins: [],
};

export default config;
