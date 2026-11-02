import React, { useContext } from 'react';
import { ContextAppLoaded } from '@app/context';
import { formatAmount } from '@app/utils/formatAmount';
import Button from '@ui/primitives/Button';
import Banner from '@ui/widgets/Banner';
import PrivateAmount from '@ui/widgets/PrivateAmount';

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
  const { translate, info } = useContext(ContextAppLoaded);
  const t = (key: string) => translate(key) as string;
  const [before, after = ''] = t('shield.notice-body').split('{amount}');
  return (
    <Banner
      testID="transparent.notice"
      tone="warning"
      title={t('shield.notice-title')}
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
      {before}
      <PrivateAmount
        inline
        variant="bodySmall"
        tone="muted"
        text={`${formatAmount(amount)} ${info.currencyName}`}
      />
      {after}
    </Banner>
  );
}
