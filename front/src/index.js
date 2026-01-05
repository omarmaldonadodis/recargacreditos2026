import React from 'react';
import ReactDOM from 'react-dom/client'; // Importa 'react-dom/client'
import App from './App';
import { AuthProvider } from './context/AuthContext'; // Importa el AuthProvider

// Crea el root usando createRoot
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <AuthProvider> {/* Envuelve tu aplicación con AuthProvider */}
      <App />
    </AuthProvider>
  </React.StrictMode>
);
