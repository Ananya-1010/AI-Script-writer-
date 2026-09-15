/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // One accent per functional area, used consistently in the product and in
      // the spec's diagrams (spec 8.5). Charts reuse these, so documentation and
      // the live product read as one visual language.
      colors: {
        creator: '#7c5cff',   // violet — creator context and profile
        app: '#4f46e5',       // indigo — application and script state
        ai: '#0d9488',        // teal   — AI generation and retrieval
        knowledge: '#d97706', // amber  — knowledge and data
        danger: '#e35d5b'     // coral  — errors
      }
    }
  },
  plugins: []
}
