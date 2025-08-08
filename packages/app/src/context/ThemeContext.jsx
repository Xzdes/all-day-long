// packages/app/src/context/ThemeContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [isLoading, setIsLoading] = useState(true);

  // При первом запуске запрашиваем сохраненную тему с сервера
  useEffect(() => {
    async function fetchInitialTheme() {
      try {
        const settings = await window.longday.call('settings.getSettings');
        if (settings && settings.theme) {
          setTheme(settings.theme);
        }
      } catch (error) {
        console.error("Failed to fetch initial theme:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchInitialTheme();
  }, []);

  // При смене темы, обновляем атрибут на <html> и отправляем на сервер
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await window.longday.call('settings.setTheme', newTheme);
    } catch (error) {
      console.error("Failed to save theme:", error);
      // Можно реализовать логику отката темы в случае ошибки
    }
  };

  if (isLoading) {
    return <div>Loading theme...</div>; // Или спиннер
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Удобный хук для использования контекста
export const useTheme = () => useContext(ThemeContext);