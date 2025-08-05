/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")], // ✅ penting: pakai presets (jamak)
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
  important: true,
};
