import React from 'react';
import TestScreen from './TestScreen';
import { describe, it, expect, beforeEach, mockWindow, MockFunction } from '../test-utils/test-helpers';

describe('TestScreen', () => {
  let fetchMock: MockFunction<any>;

  beforeEach(() => {
    const win = mockWindow();
    fetchMock = win.fetch as any;
    fetchMock.mock.mockClear();
  });

  it('triggers requests from each panel', async () => {
    const screen = TestScreen() as React.ReactElement;
    const panels = React.Children.toArray((screen.props as { children: React.ReactNode }).children) as React.ReactElement[];
    const buttons: React.ReactElement[] = [];
    panels.forEach(panel => {
      const childButtons = React.Children.toArray((panel.props as { children: React.ReactNode }).children).filter(el => (el as any).type === 'button') as React.ReactElement[];
      buttons.push(...childButtons);
    });

    for (const btn of buttons) {
      if (btn.props.onClick) {
        await btn.props.onClick();
      }
    }

    expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
  });
});
