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
        background: "#0A0D14",
        card: "#0F1622",
        "card-alt": "#141E2B",
        "card-icon": "#1A2535",
        border: "#223444",
        "border-subtle": "#1A2535",
        accent: "#00FF00",
        "text-primary": "#EDF2FA",
        "text-secondary": "#8299B4",
        "text-muted": "#5E7488",
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
