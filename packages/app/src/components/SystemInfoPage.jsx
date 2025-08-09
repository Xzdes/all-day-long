import React, { useState, useEffect } from 'react';
import { system } from '../api';
// ★★★ НАША РЕАЛИЗАЦИЯ (ЦЕНТРАЛИЗОВАННЫЙ СЕРВИС) ★★★
// Импортируем наш новый менеджер вместо прямого вызова `core`
import { workerManager } from '../services/WorkerManager';

// Константа для пути к скрипту для удобства
const HEAVY_TASK_SCRIPT = 'server/workers/heavy-task.js';

export default function SystemInfoPage() {
  // --- Системная информация и приветствие (без изменений) ---
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
  
  // --- Логика воркера, теперь управляемая через WorkerManager ---

  // Локальное состояние компонента, которое будет синхронизироваться с менеджером
  const [workerState, setWorkerState] = useState({
    id: null,
    status: 'Not running',
    progress: 0,
    isRunning: false,
  });

  // Подписываемся на изменения в WorkerManager при монтировании компонента
  useEffect(() => {
    const handleStateUpdate = (allWorkers) => {
      // В этом компоненте нас интересует только наш конкретный воркер
      let relevantState = null;
      for (const worker of allWorkers.values()) {
        if (worker.scriptPath === HEAVY_TASK_SCRIPT) {
          relevantState = worker;
          break; // Нашли, выходим
        }
      }

      if (relevantState) {
        setWorkerState({
          id: relevantState.id,
          status: relevantState.status,
          progress: relevantState.progress,
          isRunning: relevantState.isRunning,
        });
      } else {
        // Если воркера нет, сбрасываем состояние в начальное
        setWorkerState({
          id: null,
          status: 'Ready to start a new one.',
          progress: 0,
          isRunning: false,
        });
      }
    };

    // workerManager.subscribe возвращает функцию отписки
    const unsubscribe = workerManager.subscribe(handleStateUpdate);

    // Отписываемся при размонтировании компонента
    return () => unsubscribe();
  }, []); // Пустой массив зависимостей, чтобы подписка была одна на весь жизненный цикл

  const handleStartWorker = () => {
    if (workerState.isRunning) return;
    // Компонент просто просит менеджер запустить задачу
    workerManager.startTask(
      HEAVY_TASK_SCRIPT,
      { command: 'start', iterations: 500_000_000 }
    );
  };

  const handleStopWorker = () => {
    if (!workerState.id) return;
    // Компонент просто просит менеджер остановить задачу
    workerManager.stopTask(workerState.id);
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
      <p>Эта кнопка запускает тяжелую задачу в отдельном процессе, не блокируя UI. Логика управляется централизованным сервисом.</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
        <button className="btn" onClick={handleStartWorker} disabled={workerState.isRunning}>
          🚀 Запустить тяжелую задачу
        </button>
        <button className="btn" onClick={handleStopWorker} disabled={!workerState.isRunning}>
          🛑 Остановить
        </button>
      </div>
      <div>
        <p><strong>Статус:</strong> {workerState.status}</p>
        {workerState.isRunning && (
           <div style={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: '4px' }}>
             <div style={{ width: `${workerState.progress}%`, backgroundColor: '#3B82F6', color: 'white', textAlign: 'center', padding: '4px', borderRadius: '4px', transition: 'width 0.2s ease' }}>
               {workerState.progress}%
             </div>
           </div>
        )}
      </div>
    </div>
  );
}