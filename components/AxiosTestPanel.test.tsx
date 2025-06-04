import React from 'react';
import AxiosTestPanel from './AxiosTestPanel';
import { describe, it, expect, beforeEach, mockWindow, MockFunction } from '../test-utils/test-helpers';

describe('AxiosTestPanel', () => {
  let fetchMock: MockFunction<any>;

  beforeEach(() => {
    const win = mockWindow();
    fetchMock = win.fetch as any;
    fetchMock.mock.mockClear();
  });

  it('sends GET request when Axios GET button clicked', async () => {
    const panel = AxiosTestPanel() as React.ReactElement;
    const buttons = React.Children.toArray((panel.props as { children: React.ReactNode }).children) as React.ReactElement[];
    await buttons[0].props.onClick();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toContain('/posts/1');
    expect(call[1]).toMatchObject({ method: 'GET' });
  });

  it('sends POST request when Axios POST button clicked', async () => {
    const panel = AxiosTestPanel() as React.ReactElement;
    const buttons = React.Children.toArray((panel.props as { children: React.ReactNode }).children) as React.ReactElement[];
    await buttons[1].props.onClick();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toContain('/posts');
    expect(call[1]).toMatchObject({ method: 'POST' });
  });
});
