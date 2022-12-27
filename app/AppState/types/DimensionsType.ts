export default interface DimensionsType {
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  deviceType: 'tablet' | 'phone';
  scale: number;
  // eslint-disable-next-line semi
}
