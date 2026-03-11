import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { loadRuntimeConfig } from './lib/runtimeConfigLoader';
import { getAppBasePath } from './lib/runtimeConfig';
import { installAdaptiveViewport } from './lib/adaptiveViewport';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

function renderApp() {
  installAdaptiveViewport();

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={getAppBasePath()}>
          <App />
          <Toaster position="top-right" />
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

loadRuntimeConfig().finally(renderApp);
