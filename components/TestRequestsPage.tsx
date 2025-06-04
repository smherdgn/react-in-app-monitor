import React from 'react';
import TestRequestPanel from './TestRequestPanel';
import { Link } from 'react-router-dom';

const TestRequestsPage: React.FC = () => {
  return (
    <div style={{ padding: '1rem' }}>
      <h2>Test Requests</h2>
      <TestRequestPanel />
      <Link to="/">Back to Dashboard</Link>
    </div>
  );
};

export default TestRequestsPage;
