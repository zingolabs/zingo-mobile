import React, { useContext, useMemo, useState } from 'react';
import {
  LoadedAppNavigationState,
  LoadingAppNavigationState,
} from '@app/types';

// Which section of the app the root navigator shows. Switching it unmounts
// the other section, as a reset to its route used to.
export type AppSession =
  | { kind: 'loading'; params?: LoadingAppNavigationState }
  | { kind: 'wallet'; params: LoadedAppNavigationState };

type SessionContextValue = {
  session: AppSession;
  setSession: (session: AppSession) => void;
};

const SessionContext = React.createContext<SessionContextValue>({
  session: { kind: 'loading' },
  setSession: () => {},
});

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<AppSession>({ kind: 'loading' });
  const value = useMemo(() => ({ session, setSession }), [session]);
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};

export const useSession = (): SessionContextValue => useContext(SessionContext);
