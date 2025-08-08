// packages/app/src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App.jsx';
// Импортируем AppProvider вместо ThemeProvider
import { AppProvider } from './context/ThemeContext';
import './styles/App.css';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  // Используем AppProvider
  <AppProvider>
    <App />
  </AppProvider>
);