module.exports = {
  content: ["./src/**/*.{html,njk,js}"],
  safelist: [
    {
      pattern: /bg-(cream|brick-red|slate-blue|olive-gold|forest-green|ochre|navy|mustard|tan|muted-blue|dark-black|light-gray|medium-gray|charcoal|off-black)-\d{2,3}/,
    },
    {
      pattern: /text-(cream|brick-red|slate-blue|olive-gold|forest-green|ochre|navy|mustard|tan|muted-blue|dark-black|light-gray|medium-gray|charcoal|off-black)-\d{2,3}/,
    },
  ],
  theme: {
    extend: {
      screens: {
        xs: '320px',
        ml: '960px',
      },
      fontFamily: {
        sans: ["Barlow Condensed", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ["UnifrakturCook", "serif"],
        display: ["Manufacturing Consent", "serif"],
        accent: ["Pirata One", "serif"],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
