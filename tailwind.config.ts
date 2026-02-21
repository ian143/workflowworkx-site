import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        sage: {
          50: "#f4f7f0",
          100: "#e8eee2",
          200: "#d4dfc7",
          300: "#c1cfa1",
          400: "#a8bb84",
          500: "#8fa768",
          600: "#7d8b69",
          700: "#6b7f5e",
          800: "#556447",
          900: "#3d4a33",
          950: "#2a3322",
        },
      },
    },
  },
  plugins: [],
};

export default config;
