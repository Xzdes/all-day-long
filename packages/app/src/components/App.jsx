// packages/app/src/components/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './MainLayout';
import SettingsPage from './SettingsPage';
// Импортируем наш компонент для главной страницы
import SystemInfoPage from './SystemInfoPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          {/* Мы сделали отдельный компонент для системной информации главным */}
          <Route index element={<SystemInfoPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}