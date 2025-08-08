// packages/app/src/components/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './MainLayout';
import HomePage from './HomePage';
import SettingsPage from './SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Все страницы внутри MainLayout будут иметь боковое меню */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}