import { createContext } from 'react';

/**
 * Told when a modal sheet below it opens or closes, so a screen can hold
 * what should not run under a sheet (a quote's countdown) without each
 * sheet reporting it.
 */
export const SheetPresence = createContext<(open: boolean) => void>(() => {});
