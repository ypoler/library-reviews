/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Rubik", "Heebo", "system-ui", "Arial", "sans-serif"],
        heebo: ["Heebo", "system-ui", "sans-serif"],
        rubik: ["Rubik", "system-ui", "sans-serif"],
        assistant: ["Assistant", "system-ui", "sans-serif"],
        serifhe: ['"Frank Ruhl Libre"', "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
