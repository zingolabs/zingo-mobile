// The default export is a component that also carries the imperative show/hide
// statics, so the mock has to be both: renderable as <Toast config={...} /> and
// callable as Toast.show(...). Exporting the bare { show, hide } object made
// LoadingAppClass render "Element type is invalid: got object" on its post-load
// re-render.
const Toast = () => null;
Toast.show = jest.fn();
Toast.hide = jest.fn();

export default Toast;
