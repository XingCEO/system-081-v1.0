import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#16213e',
            color: '#f8f9fa',
            border: '1px solid #0f3460',
          },
          success: { iconTheme: { primary: '#00b894', secondary: '#f8f9fa' } },
          error: { iconTheme: { primary: '#e94560', secondary: '#f8f9fa' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
