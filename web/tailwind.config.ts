import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1a1a1a",
        muted: "#6b7280",
        line: "#e5e7eb",
      },
    },
  },
  plugins: [],
};

export default config;
