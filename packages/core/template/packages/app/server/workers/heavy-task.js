const dayjs = require('dayjs');

console.log('Worker has been started successfully!');

function performHeavyTask(iterations) {
  let total = 0;
  for (let i = 0; i < iterations; i++) {
    total += Math.sqrt(i);
    if (i > 0 && i % (iterations / 10) === 0) {
      const progress = Math.round((i / iterations) * 100);
      process.send({ type: 'progress', value: progress });
    }
  }
  return total;
}

process.on('message', (message) => {
  console.log(`Worker received a message:`, message);

  if (message.command === 'start') {
    const iterations = message.iterations || 500_000_000;
    
    process.send({ type: 'status', value: 'Task started...' });
    const result = performHeavyTask(iterations);
    process.send({ type: 'status', value: 'Task finished!' });
    
    process.send({
      type: 'result',
      value: `Calculation result is ${result.toFixed(2)}. Task finished at ${dayjs().format('HH:mm:ss')}.`
    });
  }
});

process.send({ type: 'ready' });