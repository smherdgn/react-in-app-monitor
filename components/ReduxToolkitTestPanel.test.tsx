import React from 'react';
import ReduxToolkitTestPanel from './ReduxToolkitTestPanel';
import { describe, it, expect, beforeEach, mockWindow, MockFunction } from '../test-utils/test-helpers';

describe('ReduxToolkitTestPanel', () => {
  let fetchMock: MockFunction<any>;

  beforeEach(() => {
    const win = mockWindow();
    fetchMock = win.fetch as any;
    fetchMock.mock.mockClear();
  });

  it('dispatches async thunk when button clicked', async () => {
    const panel = ReduxToolkitTestPanel() as React.ReactElement;
    const buttons = React.Children.toArray((panel.props as { children: React.ReactNode }).children) as React.ReactElement[];
    await buttons[1].props.onClick();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toContain('/posts/1');
    expect(call[1]).toMatchObject({ method: 'GET' });
  });
});
