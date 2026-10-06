export type Pivot = { x: number; y: number };
export type Layer = {
  source: number;
  x: number;
  y: number;
  w: number;
  h: number;
  pivot: Pivot | null;
};
export type Branch = { w: number; h: number; stem: Layer; leaves: Layer[] };

export const leftBranch: Branch = {
  w: 178,
  h: 226,
  stem: {
    source: require('../../../assets/img/leaves/left-stem.png'),
    x: 0,
    y: 0,
    w: 178,
    h: 226,
    pivot: null,
  },
  leaves: [
    {
      source: require('../../../assets/img/leaves/left-leaf-1.png'),
      x: 48.3,
      y: 8.7,
      w: 64.3,
      h: 38.7,
      pivot: { x: 4.4, y: 36 },
    },
    {
      source: require('../../../assets/img/leaves/left-leaf-2.png'),
      x: 0,
      y: 46,
      w: 31.7,
      h: 99.7,
      pivot: { x: 7.1, y: 2.8 },
    },
    {
      source: require('../../../assets/img/leaves/left-leaf-3.png'),
      x: 74.7,
      y: 66.3,
      w: 76,
      h: 24.3,
      pivot: { x: 3.4, y: 8 },
    },
    {
      source: require('../../../assets/img/leaves/left-leaf-4.png'),
      x: 63,
      y: 90.3,
      w: 47.3,
      h: 63.3,
      pivot: { x: 3.9, y: 3 },
    },
    {
      source: require('../../../assets/img/leaves/left-leaf-5.png'),
      x: 33.7,
      y: 106.7,
      w: 46,
      h: 115.7,
      pivot: { x: 12.5, y: 5.6 },
    },
    {
      source: require('../../../assets/img/leaves/left-leaf-6.png'),
      x: 120,
      y: 117.7,
      w: 36.3,
      h: 36.7,
      pivot: { x: 2.2, y: 2.2 },
    },
  ],
};

export const rightBranch: Branch = {
  w: 188,
  h: 311,
  stem: {
    source: require('../../../assets/img/leaves/right-stem.png'),
    x: 0,
    y: 0,
    w: 188,
    h: 311,
    pivot: null,
  },
  leaves: [
    {
      source: require('../../../assets/img/leaves/right-leaf-1.png'),
      x: 133,
      y: 7.7,
      w: 29,
      h: 76.7,
      pivot: { x: 4.7, y: 73.5 },
    },
    {
      source: require('../../../assets/img/leaves/right-leaf-2.png'),
      x: 101.3,
      y: 51.3,
      w: 30.3,
      h: 66.7,
      pivot: { x: 26, y: 62.8 },
    },
    {
      source: require('../../../assets/img/leaves/right-leaf-3.png'),
      x: 134.7,
      y: 77,
      w: 47.3,
      h: 49,
      pivot: { x: 3, y: 43.8 },
    },
    {
      source: require('../../../assets/img/leaves/right-leaf-4.png'),
      x: 56,
      y: 85,
      w: 63.7,
      h: 71.3,
      pivot: { x: 61, y: 67.2 },
    },
    {
      source: require('../../../assets/img/leaves/right-leaf-5.png'),
      x: 138,
      y: 123,
      w: 44.7,
      h: 78.7,
      pivot: { x: 3.8, y: 74.9 },
    },
    {
      source: require('../../../assets/img/leaves/right-leaf-6.png'),
      x: 33.3,
      y: 153,
      w: 95.3,
      h: 95.3,
      pivot: { x: 90.4, y: 91.7 },
    },
    {
      source: require('../../../assets/img/leaves/right-leaf-7.png'),
      x: 11.7,
      y: 230.3,
      w: 93,
      h: 31.7,
      pivot: { x: 87.8, y: 23.5 },
    },
  ],
};
