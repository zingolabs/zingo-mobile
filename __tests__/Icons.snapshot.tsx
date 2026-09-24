/**
 * @format
 */

import 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';

import { BiohazardIcon } from '@ui/primitives/Icons/BiohazardIcon';
import { ChevronUp, ChevronDown } from '@ui/primitives/Icons/Chevron';
import { CopyIcon } from '@ui/primitives/Icons/CopyIcon';
import { EyeIcon } from '@ui/primitives/Icons/EyeIcon';
import { FiltersIcon } from '@ui/primitives/Icons/FiltersIcon';
import { ListIcon } from '@ui/primitives/Icons/ListIcon';
import { ShieldIcon } from '@ui/primitives/Icons/ShieldIcon';
import { SkullIcon } from '@ui/primitives/Icons/SkullIcon';
import { TriangleAlert } from '@ui/primitives/Icons/TriangleAlert';
import { VerifyCheckIcon } from '@ui/primitives/Icons/VerifyCheckIcon';
import { VerifyXIcon } from '@ui/primitives/Icons/VerifyXIcon';
import { XIcon } from '@ui/primitives/Icons/XIcon';

const iconProps = { size: 24, color: '#000000' };

describe('Icon components - snapshots', () => {
  test('BiohazardIcon', () => {
    expect(render(<BiohazardIcon {...iconProps} />).toJSON()).toMatchSnapshot();
  });

  test('ChevronUp', () => {
    expect(render(<ChevronUp {...iconProps} />).toJSON()).toMatchSnapshot();
  });

  test('ChevronDown', () => {
    expect(render(<ChevronDown {...iconProps} />).toJSON()).toMatchSnapshot();
  });

  test('CopyIcon', () => {
    expect(render(<CopyIcon {...iconProps} />).toJSON()).toMatchSnapshot();
  });

  test('EyeIcon', () => {
    expect(render(<EyeIcon {...iconProps} />).toJSON()).toMatchSnapshot();
  });

  test('FiltersIcon', () => {
    expect(render(<FiltersIcon {...iconProps} />).toJSON()).toMatchSnapshot();
  });

  test('ListIcon', () => {
    expect(render(<ListIcon {...iconProps} />).toJSON()).toMatchSnapshot();
  });

  test('ShieldIcon', () => {
    expect(render(<ShieldIcon {...iconProps} />).toJSON()).toMatchSnapshot();
  });

  test('SkullIcon', () => {
    expect(render(<SkullIcon {...iconProps} />).toJSON()).toMatchSnapshot();
  });

  test('TriangleAlert', () => {
    expect(render(<TriangleAlert {...iconProps} />).toJSON()).toMatchSnapshot();
  });

  test('VerifyCheckIcon', () => {
    expect(
      render(<VerifyCheckIcon {...iconProps} />).toJSON(),
    ).toMatchSnapshot();
  });

  test('VerifyXIcon', () => {
    expect(render(<VerifyXIcon {...iconProps} />).toJSON()).toMatchSnapshot();
  });

  test('XIcon', () => {
    expect(render(<XIcon {...iconProps} />).toJSON()).toMatchSnapshot();
  });
});
