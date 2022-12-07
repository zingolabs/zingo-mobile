import { ScaledSize } from 'react-native';

/**
 * @param {ScaledSize} dim the dimensions object
 * @param {*} limit the limit on the scaled dimension
 */
const msp = (dim: ScaledSize, limit: number) => {
  return dim.scale * dim.width >= limit || dim.scale * dim.height >= limit;
};

/**
 * Returns true if the screen is in portrait mode
 * @param {ScaledSize} dim the dimensions object
 */
const isPortrait = (dim: ScaledSize) => {
  return dim.height >= dim.width;
};

/**
 * Returns true of the screen is in landscape mode
 * @param {ScaledSize} dim the dimensions object
 */
const isLandscape = (dim: ScaledSize) => {
  return dim.width >= dim.height;
};

/**
 * Returns true if the device is a tablet
 * @param {ScaledSize} dim the dimensions object
 */
const isTablet = (dim: ScaledSize) => {
  return (dim.scale < 2 && msp(dim, 1000)) || (dim.scale >= 2 && msp(dim, 1900));
};

/**
 * Returns true if the device is a phone
 * @param {ScaledSize} dim the dimensions object
 */
const isPhone = (dim: ScaledSize) => {
  return !isTablet(dim);
};

export default {
  isPortrait,
  isLandscape,
  isTablet,
  isPhone,
};
