import React from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store';
import {
  fetchPostThunk,
  postPostThunk,
  axiosGetThunk,
  axiosPostThunk,
} from '../store';

const TestRequestPanel: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

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

  const sendAxiosRequest = async (method: 'GET' | 'POST') => {
    const baseUrl = 'https://jsonplaceholder.typicode.com/posts';
    const url = method === 'GET' ? `${baseUrl}/1` : baseUrl;
    if (method === 'GET') {
      await axios.get(url);
    } else {
      await axios.post(url, { title: 'foo', body: 'bar', userId: 1 });
    }
  };

  const sendThunkRequest = async (method: 'GET' | 'POST') => {
    if (method === 'GET') {
      await dispatch(fetchPostThunk());
    } else {
      await dispatch(postPostThunk());
    }
  };

  const sendAxiosThunkRequest = async (method: 'GET' | 'POST') => {
    if (method === 'GET') {
      await dispatch(axiosGetThunk());
    } else {
      await dispatch(axiosPostThunk());
    }
  };

  const triggerError = () => {
    throw new Error('Test error from TestRequestPanel');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
      <button className="btn test-request-btn" onClick={() => sendRequest('GET')}>Send GET Request</button>
      <button className="btn test-request-btn" onClick={() => sendRequest('POST')}>Send POST Request</button>
      <button className="btn test-request-btn" onClick={() => sendAxiosRequest('GET')}>Axios GET</button>
      <button className="btn test-request-btn" onClick={() => sendAxiosRequest('POST')}>Axios POST</button>
      <button className="btn test-request-btn" onClick={() => sendThunkRequest('GET')}>Thunk GET</button>
      <button className="btn test-request-btn" onClick={() => sendThunkRequest('POST')}>Thunk POST</button>
      <button className="btn test-request-btn" onClick={() => sendAxiosThunkRequest('GET')}>Axios Thunk GET</button>
      <button className="btn test-request-btn" onClick={() => sendAxiosThunkRequest('POST')}>Axios Thunk POST</button>
      <button className="btn test-request-btn" onClick={() => sendRequest('PUT')}>Send PUT Request</button>
      <button className="btn test-request-btn" onClick={() => sendRequest('DELETE')}>Send DELETE Request</button>
      <button className="btn test-request-btn" onClick={triggerError}>Trigger Error</button>
    </div>
  );
};

export default TestRequestPanel;
