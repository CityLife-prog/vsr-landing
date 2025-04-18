module.exports = {
    content: ['./src/**/*.{js,ts,jsx,tsx}'],
    theme: {
      extend: {
        fontSize: {
          base: '1.25rem', // default 16px → now 20px
          lg: '1.5rem',
          xl: '2rem',
          '2xl': '2.5rem',
          '3xl': '3rem',
        },
      },
    },
    plugins: {
      '@tailwindcss/postcss': {},
      autoprefixer: {},
    },
  };
  