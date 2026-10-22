import React, { useContext } from 'react';
import { ContextAppLoaded } from '@app/context';
import { useTheme } from '@app/theme';
import Utils from '@app/utils';
import NoticeCard from '@ui/widgets/NoticeCard';
import { ShieldIcon } from '@ui/primitives/Icons/ShieldIcon';

/**
 * The first notice of the stack while public funds wait to be shielded:
 * how much anyone can see, and Shield, which opens the shield sheet.
 */
export default function TransparentNotice({
  amount,
  onShield,
}: {
  amount: number;
  onShield: () => void;
}) {
  const { translate, info, privacy } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const t = (key: string) => translate(key) as string;
  return (
    <NoticeCard
      testID="transparent.notice"
      icon={<ShieldIcon size={16} color={colors.fgWarning} />}
      title={t('shield.notice-title')}
      pill={{ text: t('shield.notice-public'), tone: 'warning' }}
      body={t('shield.notice-body').replace(
        '{amount}',
        privacy
          ? `••••• ${info.currencyName}`
          : `${Utils.parseNumberFloatToStringLocale(amount, 4)} ${info.currencyName}`,
      )}
      action={{
        title: t('shield.button'),
        onPress: onShield,
        testID: 'transparent.shield',
      }}
    />
  );
}
