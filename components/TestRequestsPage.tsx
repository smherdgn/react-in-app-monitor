import React from 'react';
import TestRequestPanel from './TestRequestPanel';
import { Link } from 'react-router-dom';

const TestRequestsPage: React.FC = () => {
  return (
    <div className="test-requests-overlay">
      <div className="test-requests-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Test Requests</h2>
          <Link to="/" className="btn">Close</Link>
        </div>
        <TestRequestPanel />
      </div>
    </div>
  );
};

export default TestRequestsPage;
