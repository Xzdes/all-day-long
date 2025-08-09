# all-day-long

**all-day-long** — это бронебойное, минималистичное ядро для создания нативных десктопных приложений с помощью Electron и React.

## Философия

Этот фреймворк был создан как ответ на излишне сложные, "магические" системы. Главный принцип — **прямая связь и максимальная прозрачность**. Мы не прячем механизмы за слоями абстракций, а даем вам прямой и понятный контроль над вашим приложением.

*   **Никаких Манифестов:** Вы не описываете логику в JSON-файлах, вы вызываете ее. Чтобы выполнить серверную функцию, вы просто вызываете ее из React по имени. Все просто и предсказуемо.
*   **Прозрачный Мост Данных:** Весь поток данных между вашим интерфейсом и Node.js-сервером проходит через один-единственный, асинхронный вызов функции. Вы всегда точно знаете, как данные попадают из точки А в точку Б.
*   **Строгое Разделение:** Ядро (`core`) — это "тупой", но надежный фундамент. Оно не знает ничего о вашем приложении. Вся ваша логика, UI и зависимости находятся в папке приложения (`app`). Это гарантирует, что ядро можно обновлять, не боясь сломать бизнес-логику.
*   **Полный Контроль у Вас:** Вы управляете поведением, внешним видом и API приложения через простые JS-файлы и один конфигурационный файл. Ядро просто выполняет ваши инструкции.

## Быстрый старт

**Требования:** Node.js v16+.

Для создания нового проекта, выполните в терминале одну команду:

```bash
npx all-day-long-core my-new-app
```
*(Примечание: `all-day-long-core` — это имя пакета в npm после его публикации)*

Эта команда создаст новую папку `my-new-app` со всей необходимой структурой. Затем перейдите в нее и запустите приложение:

```bash
cd my-new-app
npm install
npm run dev
```

Откроется окно вашего нового десктопного приложения.

## Как это работает: Ключевые механизмы

Ядро предоставляет три простых, но мощных механизма.

1.  **Серверный API (`/packages/app/server/api`):** Вы создаете обычные `.js` файлы с `async` функциями. Ядро автоматически находит, регистрирует их под именем `имя_файла.имя_функции` и делает доступными для вызова.
2.  **Фоновые Воркеры (`/packages/app/server/workers`):** Для долгих, ресурсоемких задач вы создаете `.js` файлы в этой папке. Ядро запускает их в отдельных, полноценных Node.js-процессах, обеспечивая 100% отзывчивость интерфейса.
3.  **Единый Мост (`window.longday.call()`):** В вашем React-коде вы вызываете любую серверную функцию или команду ядра через эту единственную точку входа, например `await window.longday.call('users.getAll')`, и получаете результат.

## Структура Проекта

Вся ваша работа сосредоточена в папке `packages/app/`.

```
/packages/app/
├── assets/                 # Иконки для сборки (.png, .ico, .icns)
├── node_modules/           # Зависимости вашего приложения (React, dayjs и т.д.)
├── public/                 # Сюда попадают скомпилированные файлы
├── server/
│   ├── api/                # ★ Ваши серверные API-функции (быстрые операции)
│   │   └── system.js
│   └── workers/            # ★ Ваши фоновые процессы (долгие операции)
│       └── heavy-task.js
├── src/
│   ├── api.js              # Удобные обертки для вызова API
│   ├── components/         # ★ Ваши React-компоненты
│   └── ...
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

В любом компоненте вы можете вызвать эти функции:

```jsx
import React, { useEffect, useState } from 'react';
// Рекомендуется использовать обертки из src/api.js для чистоты кода
import { usersApi } from '../api'; // Предполагается, что вы создали обертку

function UserList() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchUsers() {
      try {
        const userList = await window.longday.call('users.getAll');
        setUsers(userList);
      } catch (e) {
        setError(e.message);
      }
    }
    fetchUsers();
  }, []);

  if (error) {
    return <p style={{ color: 'red' }}>Ошибка: {error}</p>;
  }

  return (
    <ul>
      {users.map(user => <li key={user.id}>{user.name} ({user.email})</li>)}
    </ul>
  );
}
```

### 2. Фоновые задачи (Долгие, "тяжелые" операции)

Это **бронебойное решение** для задач, которые могут заморозить интерфейс: обработка больших файлов, сложные вычисления, архивирование. Ядро запускает ваш скрипт в полноценном дочернем процессе Node.js, гарантируя, что ваше React-приложение останется на 100% отзывчивым.

**Шаг 1: Создайте файл воркера**

Воркер — это обычный Node.js скрипт. Создадим `packages/app/server/workers/report-generator.js`.

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
  
  const reportPath = path.join(__dirname, '..', '..', 'public', `${customerName}-report.txt`);
  fs.writeFileSync(reportPath, reportContent);
  
  return reportPath;
}

// --- Управление воркером ---

// 1. Слушаем команды от React-приложения
process.on('message', (message) => {
  if (message.command === 'start') {
    process.send({ type: 'status', value: `Генерация отчета для ${message.customer}...` });
    
    const finalPath = generateReport(message.customer);
    
    // 2. Отправляем финальный результат
    process.send({ type: 'result', value: `Отчет успешно сохранен в: ${finalPath}` });
  }
});

// 3. Сообщаем React, что мы готовы принимать команды ("рукопожатие")
process.send({ type: 'ready' });
```

**Шаг 2: Управляйте воркером из React**

В вашем компоненте реализуйте полный цикл жизни: запуск, получение данных, остановка.

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { core } from '../api'; // Используем API ядра

function ReportManager() {
  const [workerId, setWorkerId] = useState(null);
  const [status, setStatus] = useState('Готов к работе.');
  const [progress, setProgress] = useState(0);

  // Обработчик сообщений от воркера
  const handleWorkerMessage = useCallback((id, data) => {
    if (id !== workerId) return;

    if (data.type === 'ready') {
      setStatus('Воркер готов. Отправка задачи...');
      core.postMessageToWorker(id, { command: 'start', customer: 'ACME Corp' });
      return;
    }
    if (data.type === 'progress') {
      setProgress(data.value);
    }
    if (data.type === 'status' || data.type === 'result') {
      setStatus(data.value);
    }
  }, [workerId]);

  // Обработчик завершения работы воркера
  const handleWorkerExit = useCallback((id, code) => {
    if (id !== workerId) return;
    setStatus(`Воркер завершил работу с кодом ${code}.`);
    setWorkerId(null);
  }, [workerId]);

  // Подписываемся на события воркера
  useEffect(() => {
    if (!workerId) return;
    const cleanupMsg = core.onWorkerMessage(handleWorkerMessage);
    const cleanupExit = core.onWorkerExit(handleWorkerExit);
    return () => {
      cleanupMsg();
      cleanupExit();
    };
  }, [workerId, handleWorkerMessage, handleWorkerExit]);

  // Функция для запуска
  const startGenerating = async () => {
    if (workerId) return;
    setProgress(0);
    setStatus('Запускаем воркер...');
    const { workerId: newId } = await core.createWorker('server/workers/report-generator.js');
    setWorkerId(newId);
  };

  return (
    <div>
      <h3>Генератор отчетов</h3>
      <button className="btn" onClick={startGenerating} disabled={!!workerId}>
        {workerId ? 'Генерация...' : 'Сгенерировать отчет'}
      </button>
      <p><strong>Статус:</strong> {status}</p>
      {workerId && (
        <div style={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: '4px' }}>
          <div style={{ width: `${progress}%`, /* ... стили для прогресс-бара */ }}>
            {progress}%
          </div>
        </div>
      )}
    </div>
  );
}
```

## Сборка приложения

Для сборки вашего приложения в установочный файл (`.exe`, `.dmg` и т.д.), выполните команду из **корня проекта**:

```bash
npm run package
```

Готовые для распространения файлы появятся в папке `/dist` в корне вашего проекта.

## Лицензия

MIT