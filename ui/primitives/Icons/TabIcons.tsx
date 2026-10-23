import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { themeTokens } from '@app/theme';

/**
 * The tab bar's four marks, as the designer drew them: the strokes in the
 * text colour, the leaves in the accent green with dark veins. Each keeps
 * its own drawing box; `size` is the height and the width follows it.
 */
type TabIconProps = {
  size?: number;
  /** The colour of the strokes; the leaves stay green. */
  color?: string;
};

const LEAF = themeTokens.bgAccent;
const VEIN = themeTokens.bottomSheetBorder;
const INK = themeTokens.fgDefault;

const frame = (width: number, height: number, size: number, x = 0, y = 0) => ({
  width: (size * width) / height,
  height: size,
  viewBox: `${x} ${y} ${width} ${height}`,
  fill: 'none',
});

/** A house with a sprout inside. */
export function HomeTabIcon({ size = 26, color = INK }: TabIconProps) {
  return (
    // Drawn on a 170 x 165 board; the box is cut to the house and its stroke.
    <Svg {...frame(103, 110, size, 33, 17)}>
      <Path
        d="M37.4867 60.8388L79.2751 24.5812C82.9623 21.3037 86.4447 21.3037 89.7222 24.5812L131.511 60.8388V113.074C131.511 119.22 128.438 122.292 122.293 122.292H47.3193C40.7642 122.292 37.4867 119.22 37.4867 113.074V60.8388Z"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M82.9109 107.169C62.7476 107.169 49.9165 94.1218 49 76C70.0797 77.4497 82.9109 89.0477 86.5769 106.445L82.9109 107.169Z"
        fill={LEAF}
      />
      <Path
        d="M68.4999 92.0174C68.1391 91.8791 67.7331 92.0601 67.5933 92.4216C67.4534 92.783 67.6326 93.1881 67.9935 93.3264L68.2467 92.6719L68.4999 92.0174ZM80.8284 103.137C81.055 103.45 81.4931 103.519 81.8068 103.291C82.1206 103.063 82.1912 102.625 81.9646 102.312L81.3965 102.725L80.8284 103.137ZM68.2467 92.6719L67.9935 93.3264C74.2083 95.7071 77.9938 99.2258 80.8284 103.137L81.3965 102.725L81.9646 102.312C78.9965 98.216 75.0044 94.5091 68.4999 92.0174L68.2467 92.6719Z"
        fill={VEIN}
      />
      <Path
        d="M83.5769 102.024C85.8718 78.6098 98.1111 64.561 118 63C118 84.0732 103.466 100.463 83.5769 102.024Z"
        fill={LEAF}
      />
      <Path
        d="M83.5769 103.554C88.7899 94.2698 94.003 87.8423 101.171 82.1289"
        stroke={VEIN}
        strokeWidth={1.40154}
        strokeLinecap="round"
      />
      <Path
        d="M84 102V113.547"
        stroke={LEAF}
        strokeWidth={5.139}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** A paper plane with a green wing and a trail. */
export function SendTabIcon({ size = 26, color = INK }: TabIconProps) {
  return (
    <Svg {...frame(116, 118, size)}>
      <Path
        d="M4 49.75L107 4.75C111.667 2.75 113 4.75 111 10.75L78 106.75C76 112.75 73 111.417 69 102.75L52 68.75L4 49.75Z"
        stroke={color}
        strokeWidth={8}
        strokeLinejoin="round"
      />
      <Path
        opacity={0.95}
        d="M49 68.75L104 10.75L76 91.75L49 68.75Z"
        fill={LEAF}
      />
      <Path
        d="M4 49.75L52 68.75L109 6.75"
        stroke={color}
        strokeWidth={7}
        strokeLinejoin="round"
      />
      <Path
        d="M9.77102 98.0875L12.0782 95.863M30.5358 78.0669L28.2286 80.2915M8.5 115L11.6044 111.86M22.4699 100.869L19.3655 104.009M30.6053 106.51L33.9869 102.736M45.8224 89.5263L42.4408 93.3004M28.8339 95.3574L31.7846 92.1165M42.1119 80.7733L39.1612 84.0142M17.8462 90.3018L22.4606 85.8527"
        stroke={LEAF}
        strokeWidth={5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** A QR code in its frame, with a leaf in the fourth square. */
export function ReceiveTabIcon({ size = 26, color = INK }: TabIconProps) {
  return (
    <Svg {...frame(102, 108, size)}>
      <Path
        d="M8 26V10C8 6 10.3333 4 15 4H25M77 4H88C92.6667 4 95 6.33333 95 11V26M8 82V98C8 102 10.3333 104 15 104H25M77 104H88C92.6667 104 95 101.667 95 97V82"
        stroke={LEAF}
        strokeWidth={8}
        strokeLinecap="round"
      />
      <Path d="M0 55H102" stroke={LEAF} strokeWidth={3} opacity={0.6} />
      <Path
        d="M20.7333 16H41.2667C43.3285 16 45 17.7909 45 20V42C45 44.2091 43.3285 46 41.2667 46H20.7333C18.6715 46 17 44.2091 17 42V20C17 17.7909 18.6715 16 20.7333 16Z"
        stroke={color}
        strokeWidth={8}
      />
      <Path
        d="M62.7333 16H83.2667C85.3285 16 87 17.7909 87 20V42C87 44.2091 85.3285 46 83.2667 46H62.7333C60.6715 46 59 44.2091 59 42V20C59 17.7909 60.6715 16 62.7333 16Z"
        stroke={color}
        strokeWidth={8}
      />
      <Path
        d="M20.7333 63H41.2667C43.3285 63 45 64.7909 45 67V89C45 91.2091 43.3285 93 41.2667 93H20.7333C18.6715 93 17 91.2091 17 89V67C17 64.7909 18.6715 63 20.7333 63Z"
        stroke={color}
        strokeWidth={8}
      />
      <Path
        d="M53.0297 95.8166C59.3674 81.9507 64.7899 71.06 76.3427 67.183C80.7906 65.2329 83.4475 65.256 87 64.2926C86.8814 76.2238 80.5733 87.1068 71.6676 92.0012C64.543 95.9167 58.3435 95.8628 53.0297 95.8166Z"
        fill={LEAF}
      />
      <Path
        opacity={0.9}
        d="M76.528 74.574C76.7659 74.4331 76.8447 74.1261 76.7041 73.8884C76.5635 73.6507 76.2567 73.5722 76.0188 73.7131L76.2734 74.1435L76.528 74.574ZM52.561 98.5604C52.4283 98.8029 52.5173 99.1069 52.7597 99.2392C53.0021 99.3716 53.3061 99.2823 53.4388 99.0397L52.9999 98.8L52.561 98.5604ZM76.2734 74.1435L76.0188 73.7131C64.3414 80.6292 58.0058 88.605 52.561 98.5604L52.9999 98.8L53.4388 99.0397C58.8192 89.2021 65.0406 81.3775 76.528 74.574L76.2734 74.1435Z"
        fill={VEIN}
      />
    </Svg>
  );
}

/** Two leaves trading places on two arrows. */
export function SwapTabIcon({ size = 26, color = INK }: TabIconProps) {
  return (
    <Svg {...frame(107, 115, size)}>
      <Path
        d="M77.2912 110.151C86.2314 112.051 98.3864 105.207 101.027 92.7816C103.668 80.3566 95.7954 67.0564 86.8552 65.1561C77.9149 63.2558 64.6412 71.5756 62.0002 84.0006C59.3592 96.4256 68.351 108.251 77.2912 110.151Z"
        fill={color}
      />
      <Path
        d="M56.0002 18C71.6447 18.8 81.6002 29.2 88.0002 42"
        stroke={LEAF}
        strokeWidth={8}
        strokeLinecap="round"
      />
      <Path
        d="M75.0002 39L89.0002 52L100 36"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M50.0002 95C34.3558 95 24.4002 83 18.0002 71"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
      />
      <Path
        d="M30.0002 74L16.0002 61L4.00024 77"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19.9484 49.2349C28.8887 51.1352 41.0436 44.2905 43.6846 31.8656C46.3256 19.4406 38.4526 6.14042 29.5124 4.24011C20.5722 2.33981 7.29844 10.6596 4.65743 23.0846C2.01642 35.5096 11.0082 47.3346 19.9484 49.2349Z"
        fill={LEAF}
      />
      <Path
        d="M28.3243 10.5281C23.4807 21.1156 21.2516 32.2276 21.6371 43.864"
        stroke={VEIN}
        strokeWidth={4}
      />
      <Path
        d="M84.5285 71.3398C80.1987 82.1476 78.5058 93.3538 79.4495 104.958"
        stroke={VEIN}
        strokeWidth={4}
      />
    </Svg>
  );
}
