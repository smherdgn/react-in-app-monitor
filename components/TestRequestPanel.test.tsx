import React from 'react';
import TestRequestPanel from './TestRequestPanel';
import { describe, it, expect, beforeEach, mockWindow, MockFunction } from '../test-utils/test-helpers';

describe('TestRequestPanel', () => {
  let mockWin: ReturnType<typeof mockWindow>;
  let fetchMock: MockFunction<any>;

  beforeEach(() => {
    mockWin = mockWindow();
    fetchMock = mockWin.fetch as any;
    fetchMock.mock.mockClear();
  });

  it('should send GET request when GET button clicked', async () => {
    const panel = TestRequestPanel() as React.ReactElement;
    const buttons = React.Children.toArray((panel.props as {children: React.ReactNode}).children) as React.ReactElement[];
    await buttons[0].props.onClick();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toContain('/posts/1');
    expect(call[1]).toMatchObject({ method: 'GET' });
  });

  it('should send POST request when POST button clicked', async () => {
    const panel = TestRequestPanel() as React.ReactElement;
    const buttons = React.Children.toArray((panel.props as {children: React.ReactNode}).children) as React.ReactElement[];
    await buttons[1].props.onClick();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toContain('/posts');
    expect(call[1]).toMatchObject({ method: 'POST' });
  });

  it('should throw an error when Trigger Error button clicked', () => {
    const panel = TestRequestPanel() as React.ReactElement;
    const buttons = React.Children.toArray((panel.props as {children: React.ReactNode}).children) as React.ReactElement[];
    const errorButton = buttons[buttons.length - 1];
    expect(() => errorButton.props.onClick()).toThrow('Test error from TestRequestPanel');
  });
});
