import React from 'react';
import axios from '../utils/axiosLike';

const AxiosTestPanel: React.FC = () => {
  const sendAxiosGet = async () => {
    await axios.get('https://jsonplaceholder.typicode.com/posts/1');
  };

  const sendAxiosPost = async () => {
    await axios.post('https://jsonplaceholder.typicode.com/posts', {
      title: 'foo',
      body: 'bar',
      userId: 1,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
      <button onClick={sendAxiosGet}>Axios GET</button>
      <button onClick={sendAxiosPost}>Axios POST</button>
    </div>
  );
};

export default AxiosTestPanel;
