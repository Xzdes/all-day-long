import React, { useState, useEffect, useCallback } from 'react';
import { system, core } from '../api';

export default function SystemInfoPage() {
  const [systemInfo, setSystemInfo] = useState(null);
  const [name, setName] = useState('Мир');
  const [greeting, setGreeting] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [workerId, setWorkerId] = useState(null);
  const [workerStatus, setWorkerStatus] = useState('Not running');
  const [workerProgress, setWorkerProgress] = useState(0);

  // ★★★ ИСПРАВЛЕНИЕ №2 (часть 2) ★★★
  // Обработчик сообщений от воркера теперь ждет сообщения 'ready'
  const handleWorkerMessage = useCallback((id, data) => {
    if (id !== workerId) return;

    // ШАГ 2: Воркер готов, отправляем ему команду на старт
    if (data.type === 'ready') {
      setWorkerStatus('Worker is ready. Sending task...');
      core.postMessageToWorker(id, { command: 'start', iterations: 500_000_000 });
      return;
    }
    
    // Обработка обычных сообщений о прогрессе и статусе
    if (data.type === 'progress') {
      setWorkerProgress(data.value);
    } else {
      setWorkerStatus(data.value);
    }
  }, [workerId]);

  const handleWorkerExit = useCallback((id, code) => {
    if (id !== workerId) return;
    setWorkerStatus(`Worker exited with code ${code}. Ready to start a new one.`);
    setWorkerId(null);
    setWorkerProgress(0);
  }, [workerId]);

  useEffect(() => {
    const cleanupMessage = core.onWorkerMessage(handleWorkerMessage);
    const cleanupExit = core.onWorkerExit(handleWorkerExit);
    
    return () => {
      cleanupMessage();
      cleanupExit();
    };
  }, [handleWorkerMessage, handleWorkerExit]);
  
  // ★★★ ИСПРАВЛЕНИЕ №2 (часть 3) ★★★
  // Функция запуска теперь только создает воркер и ждет
  const handleStartWorker = async () => {
    if (workerId) return;
    try {
      // ШАГ 1: Просто запускаем воркер
      setWorkerStatus('Starting worker...');
      const { workerId: newWorkerId } = await core.createWorker('server/workers/heavy-task.js');
      setWorkerId(newWorkerId);
      setWorkerStatus('Worker started, waiting for ready signal...');
    } catch (e) {
      setWorkerStatus(`Error: ${e.message}`);
    }
  };

  // Остальная часть файла без изменений
  const handleStopWorker = async () => {
    if (!workerId) return;
    try {
      await core.terminateWorker(workerId);
    } catch (e) {
      setWorkerStatus(`Error: ${e.message}`);
    }
  };
  
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
      ) : (<p>Загрузка системной информации...</p>)}
      <hr style={{ margin: '2rem 0' }} />
      <h2>Тест вызова API с аргументами</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Введите имя" disabled={isLoading} style={{ padding: '8px', fontSize: '1rem', minWidth: '200px' }} />
        <button className="btn" onClick={handleGreetClick} disabled={isLoading}>
          {isLoading ? 'Отправка...' : 'Поприветствовать'}
        </button>
      </div>
      {greeting && <p style={{ color: 'green', marginTop: '1em', fontSize: '1.2rem' }}>{greeting}</p>}
      {error && <p style={{ color: 'red', marginTop: '1em', fontSize: '1.2rem' }}>Ошибка: {error}</p>}
      <hr style={{ margin: '2rem 0' }} />
      <h2>Тест Фонового Воркера</h2>
      <p>Эта кнопка запускает тяжелую задачу в отдельном процессе, не блокируя UI.</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
        <button className="btn" onClick={handleStartWorker} disabled={!!workerId}>
          🚀 Запустить тяжелую задачу
        </button>
        <button className="btn" onClick={handleStopWorker} disabled={!workerId}>
          🛑 Остановить
        </button>
      </div>
      <div>
        <p><strong>Статус:</strong> {workerStatus}</p>
        {workerId && (
           <div style={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: '4px' }}>
             <div style={{ width: `${workerProgress}%`, backgroundColor: '#3B82F6', color: 'white', textAlign: 'center', padding: '4px', borderRadius: '4px', transition: 'width 0.2s ease' }}>
               {workerProgress}%
             </div>
           </div>
        )}
      </div>
    </div>
  );
}