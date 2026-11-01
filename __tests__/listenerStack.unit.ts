import { listenerStack } from '@app/services/listenerStack';

describe('listenerStack', () => {
  test('Tests that the last listener registered answers, and the one before it when that one leaves', () => {
    const stack = listenerStack<string>();
    stack.register('root');
    const remove = stack.register('modal');
    expect(stack.top()).toBe('modal');
    remove();
    expect(stack.top()).toBe('root');
  });

  test('Tests that no listener answers when null drops them all', () => {
    const stack = listenerStack<string>();
    stack.register('root');
    stack.register(null);
    expect(stack.top()).toBeUndefined();
  });
});
