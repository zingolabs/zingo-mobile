/**
 * @format
 */

import 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';

import { BiohazardIcon } from '../components/ui/Icons/BiohazardIcon';
import { ChevronUp, ChevronDown } from '../components/ui/Icons/Chevron';
import { CopyIcon } from '../components/ui/Icons/CopyIcon';
import { EyeIcon } from '../components/ui/Icons/EyeIcon';
import { FiltersIcon } from '../components/ui/Icons/FiltersIcon';
import { ListIcon } from '../components/ui/Icons/ListIcon';
import { ShieldIcon } from '../components/ui/Icons/ShieldIcon';
import { SkullIcon } from '../components/ui/Icons/SkullIcon';
import { TriangleAlert } from '../components/ui/Icons/TriangleAlert';
import { VerifyCheckIcon } from '../components/ui/Icons/VerifyCheckIcon';
import { VerifyXIcon } from '../components/ui/Icons/VerifyXIcon';
import { XIcon } from '../components/ui/Icons/XIcon';

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
