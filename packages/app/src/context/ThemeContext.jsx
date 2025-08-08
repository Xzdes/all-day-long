// packages/app/src/context/ThemeContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
// Импортируем оба API
import { settings, app } from '../api';

export const AppContext = createContext(); // Переименовываем в более общий AppContext

export function AppProvider({ children }) { // И AppProvider
  const [theme, setThemeState] = useState('light');
  const [appTitle, setAppTitle] = useState('Loading...'); // Состояние для заголовка
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchInitialData() {
      try {
        // Запрашиваем и настройки, и публичный конфиг параллельно
        const [currentSettings, publicConfig] = await Promise.all([
          settings.getSettings(),
          app.getPublicConfig(),
        ]);
        
        if (currentSettings && currentSettings.theme) {
          setThemeState(currentSettings.theme);
        }
        if (publicConfig && publicConfig.window && publicConfig.window.title) {
          setAppTitle(publicConfig.window.title);
        }
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
        setAppTitle("Error"); // Показываем ошибку в заголовке
      } finally {
        setIsLoading(false);
      }
    }
    fetchInitialData();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setThemeState(newTheme);
    try {
      await settings.setTheme(newTheme);
    } catch (error) {
      console.error("Failed to save theme, reverting UI.", error);
      setThemeState(theme);
    }
  };

  const value = { theme, toggleTheme, appTitle };

  if (isLoading) {
    return React.createElement('div', null, 'Loading App...');
  }

  return React.createElement(AppContext.Provider, { value }, children);
}

// Создаем два удобных хука для доступа к разным частям контекста
export const useTheme = () => useContext(AppContext);
export const useAppConfig = () => useContext(AppContext);