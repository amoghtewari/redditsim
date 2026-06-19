/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        'reddit-bg': '#EBEEF1',
        'reddit-orange': '#FF4500',
        'reddit-blue': '#0079D3',
        'reddit-periwinkle': '#7193FF',
        'reddit-text': '#1A1A1B',
        'reddit-card-border': '#E8EAED',
        'reddit-hover-border': '#878A8C',
        'reddit-input-bg': '#F6F7F8',
        surface: '#fcf8f9',
        'surface-container-lowest': '#ffffff',
        'surface-container-high': '#eae7e8',
        'surface-container-highest': '#e5e2e3',
        'on-surface': '#1b1b1c',
        'on-surface-variant': '#5d4038',
        primary: '#ad2c00',
        'on-primary': '#ffffff',
        secondary: '#0060a9',
        'on-secondary': '#ffffff',
        'secondary-container': '#4ba1fd',
        tertiary: '#005daa',
        'tertiary-container': '#0075d5',
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['22px', { lineHeight: '28px', fontWeight: '600' }],
        'headline-md': ['18px', { lineHeight: '24px', fontWeight: '500' }],
        'body-lg': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'label-bold': ['12px', { lineHeight: '16px', fontWeight: '700', letterSpacing: '0.5px' }],
        'meta-text': ['12px', { lineHeight: '16px', fontWeight: '400' }],
      },
      spacing: {
        'stack-gap': '12px',
        'card-padding': '14px',
        'sidebar-width': '312px',
        gutter: '16px',
        'main-content-width': '640px',
        'container-max-width': '1248px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(27, 27, 28, 0.04), 0 1px 3px rgba(27, 27, 28, 0.05)',
        'card-hover': '0 2px 6px rgba(27, 27, 28, 0.07), 0 4px 12px rgba(27, 27, 28, 0.05)',
        nav: '0 1px 3px rgba(27, 27, 28, 0.06)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.25s ease-out both',
      },
    },
  },
  plugins: [],
}
