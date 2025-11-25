// @callstack/liquid-glass.js

const LiquidGlassView = ({ children, ...props }) => (
  <div {...props}>{children}</div>
);

const isLiquidGlassSupported = jest.fn(() => false);

export { LiquidGlassView, isLiquidGlassSupported };