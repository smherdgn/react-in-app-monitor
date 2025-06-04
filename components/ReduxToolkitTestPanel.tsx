import React from 'react';

interface State {
  value: number;
  status: 'idle' | 'loading';
}

const ReduxToolkitTestPanel: React.FC = () => {
  const [state, setState] = React.useState<State>({ value: 0, status: 'idle' });

  const incrementAsync = async () => {
    setState(prev => ({ ...prev, status: 'loading' }));
    try {
      await fetch('https://jsonplaceholder.typicode.com/posts/1');
      setState(prev => ({ value: prev.value + 1, status: 'idle' }));
    } catch {
      setState(prev => ({ ...prev, status: 'idle' }));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
      <span>Toolkit Value: {state.value}</span>
      <button onClick={incrementAsync}>Redux Toolkit Async Increment</button>
    </div>
  );
};

export default ReduxToolkitTestPanel;
