// packages/app/src/services/WorkerManager.js
import { core } from '../api';

/**
 * WorkerState.
 * @typedef {object} WorkerState
 * @property {string} id - The unique ID of the worker.
 * @property {string} scriptPath - The script path for the worker.
 * @property {string} status - The current status message.
 * @property {number} progress - The current progress percentage (0-100).
 * @property {boolean} isRunning - Whether the worker is currently active.
 * @property {number|null} exitCode - The exit code of the worker, if it has terminated.
 */

/**
 * Manages the lifecycle of background workers in a centralized way.
 * This class is a singleton.
 */
class WorkerManager {
  constructor() {
    /** @type {Map<string, WorkerState>} */
    this.workers = new Map();
    /** @type {Set<function>} */
    this.listeners = new Set();

    // Subscribe to core events ONCE.
    core.onWorkerMessage(this.handleCoreMessage.bind(this));
    core.onWorkerExit(this.handleCoreExit.bind(this));

    console.log('WorkerManager initialized.');
  }

  // --- Public API for React Components ---

  /**
   * Subscribes a component to state changes.
   * @param {function(Map<string, WorkerState>)} callback - The function to call with the updated state.
   * @returns {function} A function to unsubscribe.
   */
  subscribe(callback) {
    this.listeners.add(callback);
    // Immediately give the new subscriber the current state.
    callback(this.workers); 
    return () => this.listeners.delete(callback);
  }

  /**
   * Starts a new worker task.
   * @param {string} scriptPath - The path to the worker script (e.g., 'server/workers/heavy-task.js').
   * @param {object} startMessage - The initial message to send to the worker once it's ready.
   * @returns {Promise<string>} The ID of the newly created worker.
   */
  async startTask(scriptPath, startMessage) {
    console.log(`[WorkerManager] Attempting to start task: ${scriptPath}`);
    try {
      // ★★★ НАШЕ ИСПРАВЛЕНИЕ (часть 1) ★★★
      // Перед запуском нового, удалим старый завершенный воркер с тем же путем.
      // Это предотвращает "засорение" карты состояний.
      const oldWorker = Array.from(this.workers.values()).find(
        w => w.scriptPath === scriptPath && !w.isRunning
      );
      if (oldWorker) {
        this.workers.delete(oldWorker.id);
      }
      
      const { workerId } = await core.createWorker(scriptPath);
      
      const initialState = {
        id: workerId,
        scriptPath,
        status: 'Worker created, waiting for ready signal...',
        progress: 0,
        isRunning: true,
        exitCode: null,
        startMessage: startMessage, // Store the message to send on 'ready'
      };

      this.workers.set(workerId, initialState);
      this.notifyListeners();
      console.log(`[WorkerManager] Worker ${workerId} created.`);
      return workerId;
    } catch (error) {
      console.error('[WorkerManager] Failed to start worker:', error);
      throw error;
    }
  }

  /**
   * Terminates a running worker.
   * @param {string} workerId 
   */
  async stopTask(workerId) {
    if (!this.workers.has(workerId)) {
      console.warn(`[WorkerManager] Stop task called for non-existent worker: ${workerId}`);
      return;
    }
    console.log(`[WorkerManager] Terminating worker ${workerId}`);
    try {
      await core.terminateWorker(workerId);
      // The onWorkerExit handler will clean up the state.
    } catch (error) {
      console.error(`[WorkerManager] Failed to terminate worker ${workerId}:`, error);
      const workerState = this.workers.get(workerId);
      if (workerState) {
        workerState.status = `Error during termination: ${error.message}`;
        workerState.isRunning = false;
        this.notifyListeners();
      }
    }
  }
  
  /**
   * Posts a message to a running worker.
   * @param {string} workerId 
   * @param {object} message 
   */
  postMessage(workerId, message) {
     if (!this.workers.has(workerId) || !this.workers.get(workerId).isRunning) {
      console.warn(`[WorkerManager] Cannot post message to inactive worker: ${workerId}`);
      return;
    }
    core.postMessageToWorker(workerId, message);
  }

  // --- Internal Handlers for Core Events ---

  /**
   * @private
   */
  handleCoreMessage(workerId, data) {
    if (!this.workers.has(workerId)) return;

    console.log(`[WorkerManager] Message from ${workerId}:`, data);
    const state = this.workers.get(workerId);

    switch (data.type) {
      case 'ready':
        state.status = 'Worker ready. Sending initial command...';
        if (state.startMessage) {
            core.postMessageToWorker(workerId, state.startMessage);
        }
        break;
      case 'progress':
        state.progress = data.value;
        break;
      case 'status':
      case 'result':
        state.status = data.value;
        break;
      case 'error':
        state.status = `Ошибка: ${data.message}`;
        state.isRunning = false; 
        break;
      default:
        console.warn(`[WorkerManager] Unknown message type from worker ${workerId}: ${data.type}`);
    }
    
    this.notifyListeners();
  }
  
  /**
   * @private
   */
  handleCoreExit(workerId, code) {
    if (!this.workers.has(workerId)) return;

    console.log(`[WorkerManager] Worker ${workerId} exited with code ${code}.`);
    const state = this.workers.get(workerId);
    state.isRunning = false;
    state.exitCode = code;

    // ★★★ НАШЕ ИСПРАВЛЕНИЕ (часть 2) ★★★
    // Устанавливаем понятный для пользователя статус, если ранее не была установлена ошибка.
    if (!state.status.startsWith('Ошибка:')) {
       if (code === 0) {
           // Если задача сама дошла до конца и отправила 'result'
           // не будем перезаписывать финальный результат.
           if (!state.status.includes('Calculation result')) {
               state.status = 'Задача успешно завершена.';
           }
       } else {
           state.status = 'Задача была остановлена.';
       }
    }
    
    this.notifyListeners();
  }
  
  /**
   * @private
   */
  notifyListeners() {
    for (const listener of this.listeners) {
      listener(new Map(this.workers));
    }
  }
}

// Export a single instance to act as a singleton.
export const workerManager = new WorkerManager();