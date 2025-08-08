import React, { useState, useEffect } from 'react';

export default function App() {
  const [message, setMessage] = useState('Connecting to core...');

  useEffect(() => {
    async function getMessage() {
      try {
        const result = await window.longday.call('hello.world');
        setMessage(result);
      } catch (error) {
        setMessage(`Error: ${error.message}`);
      }
    }
    getMessage();
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2em', fontSize: '1.5rem', textAlign: 'center' }}>
      <h1>Welcome to your new all-day-long App!</h1>
      <p>{message}</p>
    </div>
  );
}