import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

/**
 * Where the Options panel is: closed, in front of the home, or under a
 * screen it opened, where it waits for that screen to pop.
 */
export type OptionsPanelKind = 'closed' | 'open' | 'under';

export type OptionsPanelContextValue = {
  kind: OptionsPanelKind;
  /** The panel is in front of the home. */
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** Keeps the panel open behind a screen pushed from it. */
  sink: () => void;
  /** Brings a sunk panel back in front. */
  surface: () => void;
};

const noop = () => {};

const defaultValue: OptionsPanelContextValue = {
  kind: 'closed',
  isOpen: false,
  open: noop,
  close: noop,
  toggle: noop,
  sink: noop,
  surface: noop,
};

const OptionsPanelContext =
  createContext<OptionsPanelContextValue>(defaultValue);

export const OptionsPanelProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [kind, setKind] = useState<OptionsPanelKind>('closed');

  const open = useCallback(() => setKind('open'), []);
  const close = useCallback(() => setKind('closed'), []);
  const toggle = useCallback(
    () => setKind(previous => (previous === 'open' ? 'closed' : 'open')),
    [],
  );
  const sink = useCallback(
    () => setKind(previous => (previous === 'open' ? 'under' : previous)),
    [],
  );
  const surface = useCallback(
    () => setKind(previous => (previous === 'under' ? 'open' : previous)),
    [],
  );

  // Register module-level signals so class components and inline render
  // functions (anywhere in the tree below this Provider) can drive the panel
  // without threading the context through props.
  useEffect(() => {
    registerToggle(toggle);
    registerOpen(open);
    registerClose(close);
    return () => {
      registerToggle(null);
      registerOpen(null);
      registerClose(null);
    };
  }, [toggle, open, close]);

  const value = useMemo<OptionsPanelContextValue>(
    () => ({
      kind,
      isOpen: kind === 'open',
      open,
      close,
      toggle,
      sink,
      surface,
    }),
    [kind, open, close, toggle, sink, surface],
  );

  return (
    <OptionsPanelContext.Provider value={value}>
      {children}
    </OptionsPanelContext.Provider>
  );
};

export const useOptionsPanel = (): OptionsPanelContextValue =>
  useContext(OptionsPanelContext);

// ---------------------------------------------------------------------------
// Module-level imperative API — mirrors the pattern used by showConfirm.
// Callable from anywhere (class components, helpers, deep render fns) once
// the Provider has mounted. No-ops in dev with a warning if unwired.
// ---------------------------------------------------------------------------
type Listener = (() => void) | null;
let _toggleListener: Listener = null;
let _openListener: Listener = null;
let _closeListener: Listener = null;

const registerToggle = (fn: Listener) => {
  _toggleListener = fn;
};
const registerOpen = (fn: Listener) => {
  _openListener = fn;
};
const registerClose = (fn: Listener) => {
  _closeListener = fn;
};

const warnUnwired = (op: string) => {
  if (__DEV__) {
    console.warn(
      `[optionsPanel] ${op} called before <OptionsPanelProvider/> mounted`,
    );
  }
};

export const toggleOptionsPanel = (): void => {
  if (!_toggleListener) {
    warnUnwired('toggle');
    return;
  }
  _toggleListener();
};
export const openOptionsPanel = (): void => {
  if (!_openListener) {
    warnUnwired('open');
    return;
  }
  _openListener();
};
export const closeOptionsPanel = (): void => {
  if (!_closeListener) {
    warnUnwired('close');
    return;
  }
  _closeListener();
};
