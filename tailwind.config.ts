import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0d1117",
        card: "#161b22",
        "card-alt": "#1c2128",
        "card-icon": "#21262d",
        border: "#30363d",
        "border-subtle": "#21262d",
        accent: "#00FF00",
        "text-primary": "#e6edf3",
        "text-secondary": "#9198a1",
        "text-muted": "#7d8590",
      },
      fontFamily: {
        sans: ["var(--font-montserrat)", "system-ui", "sans-serif"],
        montserrat: ["var(--font-montserrat)", "system-ui", "sans-serif"],
        unbounded: ["var(--font-unbounded)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
