import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { useThemeStore } from '@/store/themeStore';
import App from './App';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    },
    mutations: {
      retry: 1,
    },
  },
});

const ThemedToaster = () => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: isDark ? '#1f2937' : '#ffffff',
          color: isDark ? '#e5e7eb' : '#374151',
          border: isDark ? '2px dashed #4b5563' : '2px dashed #e5e7eb',
          borderRadius: '2px',
          padding: '12px 20px',
          fontFamily: '"Patrick Hand", cursive',
          fontSize: '18px',
          boxShadow: isDark
            ? '2px 3px 0px 0px rgba(0, 0, 0, 0.3)'
            : '2px 3px 0px 0px rgba(55, 65, 81, 0.1)',
        },
        success: {
          iconTheme: {
            primary: isDark ? '#ca8a04' : '#fef08a',
            secondary: isDark ? '#e5e7eb' : '#374151',
          },
        },
        error: {
          iconTheme: {
            primary: '#f87171',
            secondary: isDark ? '#1f2937' : '#ffffff',
          },
          style: {
            border: '2px dashed #f87171',
          },
        },
      }}
    />
  );
};

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <ThemedToaster />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
