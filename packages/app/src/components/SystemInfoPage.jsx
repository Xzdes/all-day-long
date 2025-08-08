// packages/app/src/components/SystemInfoPage.jsx
import React, { useState, useEffect } from 'react';
// Импортируем наш новый, безопасный метод для работы с системной информацией
import { system } from '../api';

export default function SystemInfoPage() {
  const [systemInfo, setSystemInfo] = useState(null);
  const [name, setName] = useState('Мир');
  const [greeting, setGreeting] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchInfo() {
      try {
        const info = await system.getSystemInfo();
        setSystemInfo(info);
      } catch (e) {
        setError(e.message);
      }
    }
    fetchInfo();
  }, []);

  const handleGreetClick = async () => {
    if (!name) {
      setError("Имя не может быть пустым.");
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const message = await system.greet(name);
      setGreeting(message);
    } catch (e) {
      setGreeting('');
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1>Информация о системе</h1>
      <p>Эти данные получены напрямую с сервера Node.js через API-мост.</p>

      {systemInfo ? (
        <ul>
          <li><strong>Платформа:</strong> {systemInfo.platform}</li>
          <li><strong>CPU:</strong> {systemInfo.cpu}</li>
          <li><strong>Свободная память:</strong> {systemInfo.freemem}</li>
        </ul>
      ) : (
        <p>Загрузка системной информации...</p>
      )}

      <hr style={{ margin: '2rem 0' }} />

      <h2>Тест вызова API с аргументами</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Введите имя"
          disabled={isLoading}
          style={{ padding: '8px', fontSize: '1rem', minWidth: '200px' }}
        />
        <button className="btn" onClick={handleGreetClick} disabled={isLoading}>
          {isLoading ? 'Отправка...' : 'Поприветствовать'}
        </button>
      </div>

      {greeting && <p style={{ color: 'green', marginTop: '1em', fontSize: '1.2rem' }}>{greeting}</p>}
      {error && <p style={{ color: 'red', marginTop: '1em', fontSize: '1.2rem' }}>Ошибка: {error}</p>}
    </div>
  );
}