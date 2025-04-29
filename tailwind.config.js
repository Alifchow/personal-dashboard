/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      maxWidth: {
        '7xl': '80rem', // 1280px (already exists, but safe to re-extend if needed)
        '8xl': '90rem', // 1440px (for bigger monitors if you ever want it)
      },
      colors: {
        // Optional: Custom colors if you want tighter control later
        'primary-dark': '#0f172a', // Tailwind's slate-900 like
        'primary-blue': '#1e3a8a', // Tailwind's blue-800 like
      },
      screens: {
        'xs': '480px', // Adding an extra small breakpoint for small devices
      },
    },
  },
  plugins: [],
};
