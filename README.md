# all-day-long: Бронебойное ядро для Electron и React

**all-day-long** — это минималистичный, но чрезвычайно надежный фундамент для создания нативных десктопных приложений с помощью Electron и React. Его главная цель — обеспечить максимальную производительность, предсказуемость и отказоустойчивость, особенно при работе с долгими, ресурсоемкими задачами.

## Философия

Этот фреймворк был создан как ответ на излишне сложные, "магические" системы. Главный принцип — **прямая связь и максимальная прозрачность**.

*   **Никакой Магии:** Вы не описываете логику в JSON-файлах, вы вызываете ее. Чтобы выполнить серверную функцию, вы просто вызываете ее из React по имени. Все просто и предсказуемо.
*   **Прозрачный Мост Данных:** Весь поток данных между вашим UI и Node.js-сервером проходит через один-единственный, асинхронный вызов функции. Вы всегда точно знаете, как данные попадают из точки А в точку Б.
*   **Строгое Разделение:** Ядро (`core`) — это надежный, но "глупый" исполнитель. Оно не знает ничего о вашем приложении. Вся ваша логика, UI и зависимости находятся в папке приложения (`app`).
*   **Полный Контроль у Вас:** Вы управляете поведением, внешним видом и API приложения через простые JS-файлы и один конфигурационный файл. Ядро просто выполняет ваши инструкции.

## Быстрый старт

**Требования:** Node.js v16+.

Для создания нового проекта, выполните в терминале одну команду:

```bash
npx all-day-long-core my-new-app
```

Эта команда создаст новую папку `my-new-app` со всей необходимой структурой. Затем перейдите в нее и запустите приложение:

```bash
cd my-new-app
npm install
npm run dev
```

Откроется окно вашего нового десктопного приложения. Для удобства разработки вы можете открыть второй терминал и запустить в нем `npm run watch` — эта команда будет автоматически пересобирать ваши фоновые воркеры при сохранении изменений.

## Как это работает: Ключевые механизмы

Ядро предоставляет три простых, но мощных механизма.

1.  **Серверный API (`/packages/app/server/api`):** Вы создаете обычные `.js` файлы с `async` функциями. Ядро автоматически находит, регистрирует их под именем `имя_файла.имя_функции` и делает доступными для вызова.
2.  **Фоновые Воркеры (`/packages/app/server/workers`):** Для долгих, ресурсоемких задач вы создаете `.js` файлы в этой папке. Перед запуском ядро **собирает каждого воркера в единый, самодостаточный файл**, в который уже встроены все его npm-зависимости. Затем этот файл запускается в отдельном Node.js-процессе, гарантируя 100% отзывчивость интерфейса.
3.  **Единый Мост (`window.longday.call()`):** В вашем React-коде вы вызываете любую серверную функцию или команду ядра через эту единственную точку входа, например `await window.longday.call('users.getAll')`, и получаете результат.

## Структура Проекта

Вся ваша работа сосредоточена в папке `packages/app/`.

```
/packages/app/
├── assets/                 # Иконки для сборки (.png, .ico, .icns)
├── public/                 # Сюда попадает скомпилированный UI (bundle.js)
├── server/
│   ├── api/                # ★ Ваши серверные API-функции (быстрые операции)
│   │   └── system.js
│   ├── workers/            # ★ ИСХОДНЫЙ код ваших фоновых процессов
│   │   └── heavy-task.js
│   └── workers-dist/       # Собранные, самодостаточные воркеры (не трогать руками)
│       └── heavy-task.js
├── src/
│   ├── api.js              # Удобные обертки для вызова API
│   ├── components/         # ★ Ваши React-компоненты
│   ├── services/           # ★ Сервисы для управления сложной логикой (WorkerManager)
│   └── ...
├── esbuild.workers.js      # ★ Скрипт сборки воркеров
├── electron-builder.config.js # ★ Конфигурация сборки приложения
├── longday.config.js       # ★ Ваш главный файл конфигурации приложения
└── package.json            # ★ Зависимости и скрипты вашего приложения
```

## Руководство по разработке

### 1. Создание серверного API (Быстрые операции)

Это идеально подходит для запросов к базе данных, чтения небольших файлов или любых других операций, которые выполняются быстро (до 50-100 мс).

**Шаг 1: Создайте файл API**

Например, создадим `packages/app/server/api/users.js`:

```javascript
// packages/app/server/api/users.js

// Имитируем базу данных
const allUsers = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
];

// Все функции должны быть асинхронными (async)
async function getAll() {
  console.log('[API users.getAll] Запрос на получение всех пользователей');
  return allUsers;
}

async function getById(id) {
  console.log(`[API users.getById] Запрос на получение пользователя с id: ${id}`);
  const user = allUsers.find(u => u.id === id);
  if (!user) {
    throw new Error(`Пользователь с id ${id} не найден.`);
  }
  return user;
}

module.exports = {
  getAll,
  getById,
};
```
Ядро автоматически зарегистрирует эти функции как `users.getAll` и `users.getById`.

**Шаг 2: Вызовите API из React-компонента**

```jsx
import React, { useEffect, useState } from 'react';
// Рекомендуется создать обертку в src/api.js для чистоты кода
// import { usersApi } from '../api'; 

function UserList() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchUsers() {
      try {
        // Прямой вызов через мост
        const userList = await window.longday.call('users.getAll');
        setUsers(userList);
      } catch (e) {
        setError(e.message);
      }
    }
    fetchUsers();
  }, []);

  if (error) return <p style={{ color: 'red' }}>Ошибка: {error}</p>;
  return (
    <ul>{users.map(user => <li key={user.id}>{user.name}</li>)}</ul>
  );
}
```

### 2. Фоновые задачи (Долгие, "тяжелые" операции)

Это **бронебойное решение** для задач, которые могут заморозить интерфейс: обработка больших файлов, сложные вычисления, архивирование.

**Шаг 1: Создайте файл воркера**

Воркер — это обычный Node.js скрипт. Создадим `packages/app/server/workers/report-generator.js`. Вы можете использовать в нем любые npm-пакеты.

```javascript
// packages/app/server/workers/report-generator.js
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs'); // Воркер может использовать любые npm-пакеты!

// --- Основная логика воркера ---
function generateReport(customerName) {
  let reportContent = `Отчет для клиента: ${customerName}\n`;
  reportContent += `Сгенерирован: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}\n\n`;

  // Имитация очень долгой работы
  for (let i = 0; i < 5; i++) {
    // Сообщаем о прогрессе в React
    process.send({ type: 'progress', value: (i + 1) * 20 });
    // "Тяжелая" синхронная операция
    const start = Date.now();
    while (Date.now() - start < 1000) { /* ждем 1 секунду */ }
    reportContent += `Обработан шаг ${i + 1}...\n`;
  }
  
  // В реальном приложении путь нужно получать более надежно
  const reportPath = `report-for-${customerName}.txt`;
  // fs.writeFileSync(reportPath, reportContent);
  
  return `Отчет для ${customerName} сгенерирован.`;
}

// --- Управление воркером ---

// 1. Слушаем команды от React-приложения
process.on('message', (message) => {
  if (message.command === 'start') {
    process.send({ type: 'status', value: `Генерация отчета для ${message.customer}...` });
    
    const finalResult = generateReport(message.customer);
    
    // 2. Отправляем финальный результат
    process.send({ type: 'result', value: finalResult });
  }
});

// 3. Сообщаем React, что мы готовы принимать команды ("рукопожатие")
process.send({ type: 'ready' });
```
> **Важно:** После создания или изменения этого файла, он будет автоматически пересобран, если у вас запущен `npm run watch`. Если нет, нужно перезапустить `npm run dev`.

**Шаг 2: Управляйте воркером через `WorkerManager` из React**

В вашем компоненте используйте централизованный сервис `WorkerManager` для управления жизненным циклом воркера.

```jsx
import React, { useState, useEffect } from 'react';
// Импортируем наш менеджер
import { workerManager } from '../services/WorkerManager';

const REPORT_SCRIPT = 'server/workers/report-generator.js';

function ReportManager() {
  const [workerState, setWorkerState] = useState({ isRunning: false, status: 'Готов', progress: 0 });

  useEffect(() => {
    // Подписываемся на все изменения воркеров
    const unsubscribe = workerManager.subscribe(allWorkers => {
      // Ищем наш конкретный воркер по пути к скрипту
      const reportWorker = Array.from(allWorkers.values()).find(w => w.scriptPath === REPORT_SCRIPT);
      
      if (reportWorker) {
        setWorkerState(reportWorker);
      } else {
        // Если воркер не найден (еще не запускался или завершился)
        setWorkerState({ isRunning: false, status: 'Готов к запуску', progress: 0 });
      }
    });

    // Отписываемся при размонтировании компонента
    return () => unsubscribe();
  }, []);

  const handleStart = () => {
    // Просто просим менеджер запустить задачу
    workerManager.startTask(REPORT_SCRIPT, { command: 'start', customer: 'ACME Corp' });
  };

  const handleStop = () => {
    // Просим остановить задачу по ее ID
    if (workerState.id) {
      workerManager.stopTask(workerState.id);
    }
  };

  return (
    <div>
      <h3>Генератор отчетов</h3>
      <button onClick={handleStart} disabled={workerState.isRunning}>
        {workerState.isRunning ? 'Генерация...' : 'Сгенерировать отчет'}
      </button>
      <button onClick={handleStop} disabled={!workerState.isRunning}>
        Остановить
      </button>
      <p><strong>Статус:</strong> {workerState.status}</p>
      {workerState.isRunning && (
        <progress value={workerState.progress} max="100" style={{width: '100%'}} />
      )}
    </div>
  );
}
```

## Сборка приложения

### Конфигурационные файлы
*   `longday.config.js` — здесь вы задаете основные параметры приложения: ID, имя, размеры окна по умолчанию и т.д.
*   `electron-builder.config.js` — здесь настраивается сам процесс сборки: какие файлы включать, иконки, форматы пакетов (`.exe`, `.dmg`).

### Процесс сборки

1.  **Сборка для разработки (`npm run build`):** Эта команда собирает и UI, и самодостаточные воркеры. Она выполняется автоматически как часть `npm run dev`.
2.  **Сборка для распространения (`npm run package`):** Эта команда сначала выполняет `npm run build`, а затем упаковывает все в установочные файлы для вашей операционной системы. Готовые файлы появятся в папке `/dist` в корне вашего проекта.

> **Важно:** Перед запуском `npm run package` убедитесь, что вы остановили все запущенные процессы разработки (`Ctrl + C` в терминале). Если сборка падает с ошибкой "The process cannot access the file", это значит, что фоновый процесс от предыдущего запуска все еще блокирует файлы.

## Лицензия

MIT