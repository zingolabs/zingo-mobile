import React, { useContext } from 'react';
import { ContextAppLoaded } from '@app/context';
import Utils from '@app/utils';
import Button from '@ui/primitives/Button';
import Banner from '@ui/widgets/Banner';
import Tag from '@ui/widgets/Tag';

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
  const t = (key: string) => translate(key) as string;
  return (
    <Banner
      testID="transparent.notice"
      tone="warning"
      title={t('shield.notice-title')}
      tag={<Tag tone="transparent">{t('shield.notice-public')}</Tag>}
      actionBeside
      action={
        <Button
          testID="transparent.shield"
          variant="primary"
          size="small"
          inline
          title={t('shield.button')}
          onPress={onShield}
        />
      }
    >
      {t('shield.notice-body').replace(
        '{amount}',
        privacy
          ? `••••• ${info.currencyName}`
          : `${Utils.parseNumberFloatToStringLocale(amount, 4)} ${info.currencyName}`,
      )}
    </Banner>
  );
}
