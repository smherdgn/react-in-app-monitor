import React from 'react';

const TestRequestPanel: React.FC = () => {
  const sendRequest = async (method: string) => {
    const baseUrl = 'https://jsonplaceholder.typicode.com/posts';
    const url = method === 'GET' ? `${baseUrl}/1` : baseUrl;
    const options: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
    if (method !== 'GET' && method !== 'DELETE') {
      options.body = JSON.stringify({ title: 'foo', body: 'bar', userId: 1 });
    }
    try {
      await fetch(url, options);
    } catch (err) {
      console.error('Test request failed', err);
    }
  };

  const triggerError = () => {
    throw new Error('Test error from TestRequestPanel');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
      <button onClick={() => sendRequest('GET')}>Send GET Request</button>
      <button onClick={() => sendRequest('POST')}>Send POST Request</button>
      <button onClick={() => sendRequest('PUT')}>Send PUT Request</button>
      <button onClick={() => sendRequest('DELETE')}>Send DELETE Request</button>
      <button onClick={triggerError}>Trigger Error</button>
    </div>
  );
};

export default TestRequestPanel;
