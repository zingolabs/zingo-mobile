export const getString = jest.fn(() =>
  Promise.resolve('mocked clipboard content'),
);
export const setString = jest.fn();

export default { getString, setString };
