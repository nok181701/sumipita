import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f2c38",
        muted: "#5b7c88",
        line: "#dcecf1",
        aqua: {
          50: "#f2fbfd",
          100: "#e2f5fa",
          200: "#c3e9f2",
          500: "#2bb3cd",
          600: "#1a94ac",
          700: "#0f7285",
        },
        // スコアの3段階。彩度は落としたが、順序が色相で読めるようにしている
        good: "#0fa97f",
        mid: "#e8a13a",
        bad: "#e35d6a",
      },
      borderRadius: {
        card: "1rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,44,56,.04), 0 8px 24px -12px rgba(15,44,56,.18)",
      },
    },
  },
  plugins: [],
};

export default config;
