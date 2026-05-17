/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#07100f",
        panel: "#0d1816",
        panelLine: "#1e3834",
        cyanfire: "#4df7ff",
        mint: "#72f5a6",
        amberwire: "#ffce65",
        danger: "#ff5c7a",
        violetline: "#a78bfa"
      },
      boxShadow: {
        glow: "0 0 30px rgba(77, 247, 255, 0.18)",
        danger: "0 0 30px rgba(255, 92, 122, 0.2)"
      },
      animation: {
        "scan-line": "scan-line 3.2s linear infinite",
        "pulse-ring": "pulse-ring 2.4s ease-out infinite",
        "float-panel": "float-panel 6s ease-in-out infinite",
        "matrix-flow": "matrix-flow 18s linear infinite"
      },
      keyframes: {
        "scan-line": {
          "0%": { transform: "translateY(-120%)", opacity: "0" },
          "12%": { opacity: "1" },
          "100%": { transform: "translateY(520%)", opacity: "0" }
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.72)", opacity: "0.9" },
          "100%": { transform: "scale(1.42)", opacity: "0" }
        },
        "float-panel": {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" }
        },
        "matrix-flow": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 220px" }
        }
      }
    },
  },
  plugins: [],
};

