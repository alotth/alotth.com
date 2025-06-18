/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0070f3",
        secondary: "#1a1a1a",
        gamers: {
          background: "#1C1E2B",
          accent: "#E85F5F",
          hover: "#ff7070",
        },
        valorant: {
          500: "#FF4500",
          600: "#FF6B33",
        },
      },
      textShadow: {
        gamers: "0 0 10px rgba(232,95,95,0.3)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out",
        "slide-in-left": "slide-in-left 0.5s ease-out",
        "slide-in-right": "slide-in-right 0.5s ease-out",
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      const newUtilities = {
        ".text-shadow-valorant": {
          "text-shadow": "0 0 10px rgba(255,70,85,0.3)",
        },
        ".text-shadow-gamers": {
          "text-shadow": "0 0 10px rgba(232,95,95,0.3)",
        },
      };
      addUtilities(newUtilities);
    },
  ],
  safelist: [
    "bg-gamers-background",
    "bg-gamers-accent",
    "text-gamers-accent",
    "border-gamers-accent",
    "marker:text-gamers-accent",
    "hover:text-gamers-hover",
    "text-shadow-gamers",
    "bg-valorant-500",
    "text-valorant-500",
    "border-valorant-500",
    "marker:text-valorant-500",
    "hover:text-valorant-600",
    "text-shadow-valorant",
  ],
};
