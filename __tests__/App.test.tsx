/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders correctly', async () => {
  jest.useFakeTimers();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });

  // Flush the splash-screen animation timers so no animation work is still
  // scheduled when the test environment is torn down.
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(15000);
  });

  await ReactTestRenderer.act(() => {
    renderer.unmount();
  });
  jest.useRealTimers();
});
