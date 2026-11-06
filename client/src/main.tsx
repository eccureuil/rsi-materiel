import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/Toast';
import { ConfirmProvider } from '@/components/ConfirmDialog';
import App from '@/App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Élément #root introuvable dans index.html");

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);