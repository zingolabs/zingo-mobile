declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

declare module 'qrcode' {
  export function create(
    text: string,
    options: { errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' },
  ): { modules: { size: number; get(row: number, col: number): number } };
}
