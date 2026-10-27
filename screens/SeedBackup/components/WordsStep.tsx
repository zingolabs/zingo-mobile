/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View } from 'react-native';

import { space12, space16 } from '@app/theme';
import Checkbox from '@ui/primitives/Checkbox';
import { ContextAppLoaded } from '@app/context';
import { formatInteger } from '@app/utils/formatAmount';
import { SIDE, StepTitle } from './StepParts';
import { CopyShowButtons, InfoRow, WordGrid } from './SeedParts';

type WordsStepProps = {
  words: string[];
  // Block height the wallet was created at, written down with the words.
  birthday: number;
  hidden: boolean;
  // Words veil while hidden, and while the screenshot warning is up.
  veiled: boolean;
  onToggleHide: () => void;
  onCopy: () => void;
  checked: boolean;
  onCheck: () => void;
};

// The 24 words in order, with the birthday, Copy, Show and the paper checkbox.
const WordsStep: React.FunctionComponent<WordsStepProps> = ({
  words,
  birthday,
  hidden,
  veiled,
  onToggleHide,
  onCopy,
  checked,
  onCheck,
}) => {
  const { translate } = useContext(ContextAppLoaded);
  const [tipOpen, setTipOpen] = useState(false);

  return (
    <View onTouchStart={() => tipOpen && setTipOpen(false)}>
      <StepTitle
        title={translate('seedbackup.words-title') as string}
        sub={translate('seedbackup.words-sub') as string}
      />
      <WordGrid testID="seedbackup.words" words={words} veiled={veiled} />
      <View style={{ marginTop: space12, zIndex: 2 }}>
        <InfoRow
          testID="seedbackup.birthday"
          label={translate('seedbackup.birthday') as string}
          tipTitle={translate('seedbackup.birthday-tip-title') as string}
          tipBody={translate('seedbackup.birthday-tip-body') as string}
          open={tipOpen}
          onToggle={setTipOpen}
          value={formatInteger(birthday)}
        />
      </View>
      <View style={{ marginTop: space12 }}>
        <CopyShowButtons
          testID="seedbackup"
          hidden={hidden}
          onToggleHide={onToggleHide}
          onCopy={onCopy}
        />
      </View>
      <View style={{ marginHorizontal: SIDE, marginTop: space16 }}>
        <Checkbox
          testID="seedbackup.check"
          checked={checked}
          onChange={onCheck}
          label={translate('seedbackup.paper') as string}
        />
      </View>
    </View>
  );
};

export default WordsStep;
