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
  requestReminderPermission,
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
 * migration, still splitting, or all sent) it clears the reminders. `status`
 * null (not read yet, or the read failed) leaves the reminders alone.
 *
 * When there are reminders to arm and permission is missing, it asks for it:
 * the schedule confirmation is otherwise the only place that ever prompts, so
 * a migration confirmed in an older build (or a denial back then) left the
 * user with no reminders and nowhere in the app to grant them. It asks once
 * per schedule per mount — so once more each time the app is opened, which is
 * the insistence a wallet that would rather remind you needs, without turning
 * a refusal into a loop. Android stops showing the dialog after two denials
 * and answers no on its own.
 *
 * Returns the permission as read (`null` until known), so a screen can say
 * whether reminders will actually arrive.
 */
export function useRearmBatchReminders(
  status: RPCMigrationStatusType | null,
): boolean | null {
  const context = useContext(ContextAppLoaded);
  const { translate, info } = context;
  const { permitted, refresh } = useReminderPermission();
  const signature = status ? batchRemindersSignature(status) : null;
  // A permission change counts as a change: a grant arms what a denial could
  // not.
  const key = signature === null ? null : `${signature}#${permitted}`;
  const handledKey = useRef<string | null>(null);
  const promptedSignature = useRef<string | null>(null);

  useEffect(() => {
    if (!status || key === null || signature === null) {
      return;
    }
    if (key === handledKey.current) {
      return;
    }
    handledKey.current = key;
    (async () => {
      try {
        if ((status.upcoming_windows ?? []).length === 0) {
          await cancelBatchReminders();
          return;
        }
        if (permitted === null) {
          // Not known yet; the read lands in a moment and re-runs this.
          handledKey.current = null;
          return;
        }
        if (!permitted) {
          if (promptedSignature.current === signature) {
            return;
          }
          promptedSignature.current = signature;
          const granted = await requestReminderPermission();
          refresh();
          if (!granted) {
            return;
          }
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
