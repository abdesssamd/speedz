import forms from "@tailwindcss/forms";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#ea580c",
          strong: "#f97316",
          soft: "rgba(249,115,22,0.14)",
        },
      },
      boxShadow: {
        soft: "0 12px 30px rgba(15, 23, 42, 0.08)",
        card: "0 18px 40px rgba(15, 23, 42, 0.08)",
      },
      borderRadius: {
        xl2: "16px",
      },
    },
  },
  plugins: [forms],
};