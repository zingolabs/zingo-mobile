import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Linking } from 'react-native';
import {
  BiometricGateOutcome,
  EventListenerEnum,
  RouteEnum,
} from '@app/AppState';
import { LoadedAppNavigationState } from '@app/types';

export type GateDeclined = Extract<BiometricGateOutcome, { kind: 'declined' }>;

// Which section of the app the root shows. Switching sections unmounts the
// one left behind, as a reset to its route used to.
export type AppSession =
  // The boot gate, then the wallet opens. `startingApp` asks the gate;
  // `newWallet` makes the wallet rebuild its address book.
  | { kind: 'boot'; startingApp: boolean; newWallet: boolean }
  // A declined gate; the retry returns to boot.
  | { kind: 'locked'; gate: GateDeclined }
  // The stage opens on the welcome, or on the error of a wallet that did
  // not open.
  | { kind: 'onboarding'; start: RouteEnum.Welcome | RouteEnum.OpenError }
  | { kind: 'wallet'; params: LoadedAppNavigationState };

export type LoadingSession = Exclude<AppSession, { kind: 'wallet' }>;

type SessionContextValue = {
  session: AppSession;
  setSession: (session: AppSession) => void;
  // A `zcash:` link that arrived before the wallet could take it. The wallet
  // section clears it once Send has it.
  pendingLink: string | undefined;
  clearLink: () => void;
};

const SessionContext = React.createContext<SessionContextValue>({
  session: { kind: 'boot', startingApp: true, newWallet: false },
  setSession: () => {},
  pendingLink: undefined,
  clearLink: () => {},
});

type SessionProviderProps = {
  initial?: AppSession;
  children: React.ReactNode;
};

export const SessionProvider: React.FC<SessionProviderProps> = ({
  initial = { kind: 'boot', startingApp: true, newWallet: false },
  children,
}) => {
  const [session, setSession] = useState<AppSession>(initial);
  const [pendingLink, setPendingLink] = useState<string>();
  const current = useRef(session);
  current.current = session;

  // A link is kept through boot and lock, and dropped during onboarding:
  // there is no wallet to pay from.
  useEffect(() => {
    const take = (url: string | null) => {
      if (url && current.current.kind !== 'onboarding') {
        setPendingLink(url);
      }
    };
    Linking.getInitialURL().then(take);
    const sub = Linking.addEventListener(EventListenerEnum.url, ({ url }) =>
      take(url),
    );
    return () => sub.remove();
  }, []);

  const clearLink = useCallback(() => setPendingLink(undefined), []);
  const value = useMemo(
    () => ({ session, setSession, pendingLink, clearLink }),
    [session, pendingLink, clearLink],
  );
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};

export const useSession = (): SessionContextValue => useContext(SessionContext);
