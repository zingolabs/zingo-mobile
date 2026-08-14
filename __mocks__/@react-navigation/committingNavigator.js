// A committing stand-in for a react-navigation navigator, shared by the
// native-stack and bottom-tabs mocks. The default string-host mocks
// ('MockedNavigator'/'MockedScreen') make React skip the render-prop bodies, so
// LoadedApp never commits and componentDidMount never runs (see the
// state-machine-hardening characterization-fence-spec, seam B). This renders the
// focused route's body — invoking the render-prop and its effects — and emits an
// inert, testID-tagged marker per registered route so route presence is
// assertable without mounting every sibling screen.

const React = require('react');

// One shared navigation object per navigator kind. LoadedApp captures it as
// `drawerNav` via setNavigationHome, so its `navigate` is where the Seed-routing
// invariant lands. jest.clearAllMocks() resets the call records between tests.
function makeNavigation() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    setParams: jest.fn(),
    setOptions: jest.fn(),
    reset: jest.fn(),
    canGoBack: jest.fn(() => false),
    isFocused: jest.fn(() => true),
    addListener: jest.fn(() => () => {}),
    removeListener: jest.fn(),
    getState: jest.fn(() => ({ routes: [], index: 0 })),
    getParent: jest.fn(),
  };
}

function renderRouteBody(navigation, child) {
  const { name, children, component } = child.props;
  const navProps = { navigation, route: { key: name, name, params: {} } };
  if (typeof children === 'function') {
    return children(navProps);
  }
  if (component) {
    return React.createElement(component, navProps);
  }
  return children ?? null;
}

// Build a { Navigator, Screen } pair over one shared navigation object.
function makeNavigator() {
  const navigation = makeNavigation();

  function Navigator({ children, initialRouteName }) {
    const kids = React.Children.toArray(children).filter(React.isValidElement);
    const names = kids.map(k => k.props.name);
    const focusedName = names.includes(initialRouteName)
      ? initialRouteName
      : names[0];

    return React.createElement(
      React.Fragment,
      null,
      kids.map(child => {
        const isFocused = child.props.name === focusedName;
        return React.createElement(
          'MockNavRoute',
          {
            key: child.props.name,
            name: child.props.name,
            testID: `nav-route-${child.props.name}`,
            focused: isFocused,
          },
          isFocused ? renderRouteBody(navigation, child) : null,
        );
      }),
    );
  }

  // The Navigator reads Screen elements' props directly; Screen is never mounted
  // on its own, so a null body is enough to keep it a valid element type.
  const Screen = () => null;

  return { Navigator, Screen, navigation };
}

module.exports = { makeNavigator };
