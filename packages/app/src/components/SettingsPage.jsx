// packages/app/src/components/SettingsPage.jsx
import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div>
      <h1>Настройки</h1>
      <p>Текущая тема: <strong>{theme}</strong></p>
      {/* ★★★ НАШЕ ИСПРАВЛЕНИЕ ★★★ */}
      {/* Добавляем кнопке общий класс 'btn' */}
      <button className="btn" onClick={toggleTheme}>
        Переключить на {theme === 'light' ? 'темную' : 'светлую'} тему
      </button>
    </div>
  );
}