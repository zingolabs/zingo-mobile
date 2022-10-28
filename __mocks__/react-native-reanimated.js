export const mockAnimated = jest.fn();
const mock = jest.fn().mockImplementation(() => {
  return {
    Animated: {
      Value: mockAnimated,
    },
    EasingNode: {
      linear: '',
    },
  };
});

export default mock;
