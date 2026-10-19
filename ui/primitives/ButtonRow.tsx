/* eslint-disable react-native/no-inline-styles */
import React, { Children, cloneElement, useRef, useState } from 'react';
import { View } from 'react-native';
import { space12 } from '@app/theme';
import type { ButtonProps } from './Button';

type ButtonRowProps = {
  /** `text` first, `primary` second: left and right in a row. */
  children: React.ReactElement<ButtonProps>[];
};

/**
 * Two actions side by side at equal width. When a label no longer fits on
 * one line they stack, primary on top, each at full width.
 */
const ButtonRow: React.FunctionComponent<ButtonRowProps> = ({ children }) => {
  const [stacked, setStacked] = useState(false);
  const width = useRef(0);

  return (
    <View
      onLayout={e => {
        const next = e.nativeEvent.layout.width;
        /** A new width can make the labels fit again, so measure afresh. */
        if (Math.abs(next - width.current) > 1) {
          width.current = next;
          setStacked(false);
        }
      }}
      style={{
        flexDirection: stacked ? 'column-reverse' : 'row',
        gap: space12,
        alignSelf: 'stretch',
        flexGrow: 1,
      }}
    >
      {Children.map(children, child =>
        cloneElement(child, {
          fullWidth: stacked,
          style: { ...(stacked ? {} : { flex: 1 }), ...child.props.style },
          onLabelLines: (lines: number) => {
            if (lines > 1) {
              setStacked(true);
            }
          },
        }),
      )}
    </View>
  );
};

export default ButtonRow;
