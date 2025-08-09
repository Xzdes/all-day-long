import React, { useState, useEffect } from 'react';
import { system } from '../api';
import { workerManager } from '../services/WorkerManager';

const HEAVY_TASK_SCRIPT = 'server/workers/heavy-task.js';

export default function SystemInfoPage() {
  const [systemInfo, setSystemInfo] = useState(null);
  const [name, setName] = useState('Мир');
  const [greeting, setGreeting] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [workerState, setWorkerState] = useState({
    id: null,
    status: 'Ready to start.',
    progress: 0,
    isRunning: false,
  });

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

  useEffect(() => {
    // ★★★ НАШЕ ГЛАВНОЕ ИСПРАВЛЕНИЕ ★★★
    const handleStateUpdate = (allWorkers) => {
      // Ищем АКТИВНЫЙ воркер, который соответствует нашему скрипту.
      const activeWorker = Array.from(allWorkers.values()).find(
        (w) => w.scriptPath === HEAVY_TASK_SCRIPT && w.isRunning
      );

      if (activeWorker) {
        // Если нашли активный воркер, обновляем состояние UI по нему.
        setWorkerState({
          id: activeWorker.id,
          status: activeWorker.status,
          progress: activeWorker.progress,
          isRunning: activeWorker.isRunning,
        });
      } else {
        // Если АКТИВНОГО воркера нет, ищем последний завершившийся, чтобы показать его статус.
        const lastFinishedWorker = Array.from(allWorkers.values())
          .filter(w => w.scriptPath === HEAVY_TASK_SCRIPT && !w.isRunning)
          .sort((a, b) => b.exitCode - a.exitCode) // Просто для какой-то сортировки
          .pop();

        if (lastFinishedWorker) {
            setWorkerState({
              id: lastFinishedWorker.id,
              status: lastFinishedWorker.status,
              progress: lastFinishedWorker.progress,
              isRunning: false, // Он точно не запущен
            });
        } else {
             // Если нет ни активного, ни завершенного - сбрасываем в исходное состояние.
            setWorkerState({
                id: null,
                status: 'Готов к запуску новой задачи.',
                progress: 0,
                isRunning: false,
            });
        }
      }
    };

    const unsubscribe = workerManager.subscribe(handleStateUpdate);
    return () => unsubscribe();
  }, []);

  const handleStartWorker = () => {
    if (workerState.isRunning) return;
    workerManager.startTask(
      HEAVY_TASK_SCRIPT,
      { command: 'start', iterations: 500_000_000 }
    );
  };

  const handleStopWorker = () => {
    if (!workerState.id || !workerState.isRunning) return;
    workerManager.stopTask(workerState.id);
  };
  
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
        {(workerState.isRunning || workerState.progress > 0) && (
           <div style={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: '4px' }}>
             <div style={{ width: `${workerState.progress}%`, backgroundColor: '#3B82F6', color: 'white', textAlign: 'center', padding: '4px', borderRadius: '4px', transition: 'width 0.2s ease' }}>
               {workerState.progress > 0 ? `${workerState.progress}%` : ''}
             </div>
           </div>
        )}
      </div>
    </div>
  );
}