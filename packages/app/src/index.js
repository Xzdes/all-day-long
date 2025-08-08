// packages/app/src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App.jsx';
import { ThemeProvider } from './context/ThemeContext';
import './styles/App.css'; // Импортируем наши стили

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);