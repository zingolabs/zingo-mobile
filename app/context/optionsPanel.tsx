import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

/**
 * State for the global Options panel — a vertical slide-down overlay that
 * replaces the legacy drawer. The active screen slides off the bottom; this
 * panel sits behind it and is revealed.
 *
 * Step 1: state-only (open/close/toggle). The animated translateY and the
 * actual back-gesture / sheet-cleanup wiring come in step 3+.
 */
export type OptionsPanelContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const noop = () => {};

const defaultValue: OptionsPanelContextValue = {
  isOpen: false,
  open: noop,
  close: noop,
  toggle: noop,
};

const OptionsPanelContext =
  createContext<OptionsPanelContextValue>(defaultValue);

export const OptionsPanelProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  // Register module-level signals so class components and inline render
  // functions (anywhere in the tree below this Provider) can drive the panel
  // without threading the context through props.
  useEffect(() => {
    registerToggle(toggle);
    registerClose(close);
    return () => {
      registerToggle(null);
      registerClose(null);
    };
  }, [toggle, close]);

  const value = useMemo<OptionsPanelContextValue>(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle],
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
let _closeListener: Listener = null;

const registerToggle = (fn: Listener) => {
  _toggleListener = fn;
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
export const closeOptionsPanel = (): void => {
  if (!_closeListener) {
    warnUnwired('close');
    return;
  }
  _closeListener();
};
