import { useContext, useEffect, useRef } from 'react';

import { ChainNameEnum } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import {
  batchRemindersSignature,
  buildBatchReminders,
} from '@app/notifications/batchReminders';
import {
  armBatchReminders,
  cancelBatchReminders,
} from '@app/notifications/reminders';
import { RPCMigrationStatusType } from '@app/walletBackend/types/RPCMigrationStatusType';
import { useReminderPermission } from './useReminderPermission';

/**
 * Keeps the batch reminders in step with the schedule. They used to be armed
 * once, at schedule confirmation, so a batch that slid or was rebuilt into
 * another window left its old reminder firing with nothing to send, and
 * windows past the 32-window horizon never got one.
 *
 * Re-arms whenever the upcoming windows (or their numbering) change, starting
 * with the first status a screen reads, and when notification permission is
 * granted later from the system settings. With no upcoming windows left (no
 * migration, still splitting, or all sent) it clears the reminders. Never
 * prompts for permission: without it, nothing is armed. `status` null (not
 * read yet, or the read failed) leaves the reminders alone.
 *
 * Returns the permission as read (`null` until known), so a screen can say
 * whether reminders will actually arrive.
 */
export function useRearmBatchReminders(
  status: RPCMigrationStatusType | null,
): boolean | null {
  const context = useContext(ContextAppLoaded);
  const { translate, info } = context;
  const permitted = useReminderPermission();
  const signature = status ? batchRemindersSignature(status) : null;
  // A permission change counts as a change: a grant arms what a denial could
  // not.
  const key = signature === null ? null : `${signature}#${permitted}`;
  const handledKey = useRef<string | null>(null);

  useEffect(() => {
    if (!status || key === null || key === handledKey.current) {
      return;
    }
    handledKey.current = key;
    (async () => {
      try {
        if ((status.upcoming_windows ?? []).length === 0) {
          await cancelBatchReminders();
          return;
        }
        if (permitted !== true) {
          return;
        }
        await armBatchReminders(
          buildBatchReminders(
            status,
            {
              latestBlock: info?.latestBlock,
              secondsPerBlock: info?.secondsPerBlock,
              mainnet: info?.chainName === ChainNameEnum.mainChainName,
            },
            {
              title: (n: number) =>
                (
                  translate('migrationschedule.reminder-title') as string
                ).replace('{n}', String(n)),
              body: translate('migrationschedule.reminder-body') as string,
            },
            Date.now(),
          ),
        );
      } catch {
        // Try again on the next change rather than never.
        handledKey.current = null;
      }
    })();
    // Keyed to the signature and the permission: info and translate only
    // shape the text and the estimate, and a new block alone must not re-arm
    // every reminder.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return permitted;
}
