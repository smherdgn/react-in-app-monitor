import React from 'react';
import TestRequestPanel from './TestRequestPanel';
import AxiosTestPanel from './AxiosTestPanel';
import ReduxToolkitTestPanel from './ReduxToolkitTestPanel';

const TestScreen: React.FC = () => (
  <div>
    <TestRequestPanel />
    <AxiosTestPanel />
    <ReduxToolkitTestPanel />
  </div>
);

export default TestScreen;
