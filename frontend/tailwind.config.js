/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#F5F7FA',
          surface: '#FFFFFF',
          text: '#172033',
          muted: '#667085',
          border: '#E3E8EF',
          sidebar: '#111827',
          sidebarHover: '#1D2939',
          sidebarActive: '#1F2A37',
          primary: '#356AE6',
          primaryHover: '#2954B8',
          success: '#16805D',
          successBg: '#E8F5EF',
          warning: '#B7791F',
          warningBg: '#FEF6E7',
          error: '#C63D4F',
          errorBg: '#FDF2F2',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(16, 24, 40, 0.05), 0 1px 2px 0 rgba(16, 24, 40, 0.03)',
        card: '0 1px 3px 0 rgba(16, 24, 40, 0.07), 0 1px 2px -1px rgba(16, 24, 40, 0.04)',
        modal: '0 20px 25px -5px rgba(16, 24, 40, 0.1), 0 8px 10px -6px rgba(16, 24, 40, 0.05)',
      }
    },
  },
  plugins: [],
};
