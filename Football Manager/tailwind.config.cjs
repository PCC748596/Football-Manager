/*
O TAILWIND NO BUILD (era o cdn.tailwindcss.com, que precisa de internet e avisa que nao e para producao). A mesma configuracao que estava no index.html.
`content` sao os ficheiros onde as classes aparecem: o Tailwind so gera o CSS das classes que encontra neles.
*/
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './index.tsx', './App.tsx', './components/**/*.{ts,tsx}', './context/**/*.{ts,tsx}', './textSim/**/*.{ts,tsx}', './3dMatch/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        manager: { bg: '#0f172a', panel: '#1e293b', accent: '#3b82f6', success: '#10b981', danger: '#ef4444', text: '#f1f5f9', muted: '#94a3b8' }
      }
    }
  },
  plugins: []
};
