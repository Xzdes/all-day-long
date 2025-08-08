// packages/app/src/components/TitleBar.jsx
import React from 'react';
// Импортируем наш новый window api из централизованного шлюза
import { windowApi } from '../api';

// Стили вынесены наружу для лучшей читаемости
const titleBarStyle = {
  height: '32px',
  backgroundColor: 'var(--bg-secondary)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingLeft: '1rem',
  borderBottom: '1px solid var(--border-color)',
  // Эта CSS-инструкция говорит Electron, что за эту область можно перетаскивать окно мышью.
  WebkitAppRegion: 'drag',
  // Чтобы текст нельзя было выделить.
  userSelect: 'none',
  flexShrink: 0, // Предотвращает сжатие
};

const titleTextStyle = {
  color: 'var(--text-secondary)',
  fontSize: '0.8rem',
};

const buttonGroupStyle = {
  display: 'flex',
  // Эта CSS-инструкция говорит, что сами кнопки НЕ являются областью для перетаскивания.
  WebkitAppRegion: 'no-drag',
};

const buttonStyle = {
  width: '46px',
  height: '32px',
  border: 'none',
  backgroundColor: 'transparent',
  color: 'var(--text-primary)',
  fontSize: '1rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  outline: 'none',
};

const closeButtonStyle = {
  ...buttonStyle,
};

export default function TitleBar({ title }) {
  // Обработчики для наведения мыши для визуальных эффектов
  const handleMouseEnter = (e) => e.currentTarget.style.backgroundColor = 'var(--border-color)';
  const handleMouseLeave = (e) => e.currentTarget.style.backgroundColor = 'transparent';
  const handleCloseMouseEnter = (e) => e.currentTarget.style.backgroundColor = '#E81123';
  const handleCloseMouseLeave = (e) => e.currentTarget.style.backgroundColor = 'transparent';
  const handleCloseColorEnter = (e) => e.currentTarget.style.color = 'white';
  const handleCloseColorLeave = (e) => e.currentTarget.style.color = 'var(--text-primary)';


  return (
    <div style={titleBarStyle}>
      <span style={titleTextStyle}>{title}</span>
      <div style={buttonGroupStyle}>
        <button style={buttonStyle} onClick={windowApi.minimize} title="Свернуть" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          —
        </button>
        <button style={buttonStyle} onClick={windowApi.toggleMaximize} title="Развернуть" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          ▢
        </button>
        <button
          style={closeButtonStyle}
          onClick={windowApi.close}
          title="Закрыть"
          onMouseEnter={(e) => { handleCloseMouseEnter(e); handleCloseColorEnter(e);}}
          onMouseLeave={(e) => { handleCloseMouseLeave(e); handleCloseColorLeave(e);}}
        >
          ✕
        </button>
      </div>
    </div>
  );
}