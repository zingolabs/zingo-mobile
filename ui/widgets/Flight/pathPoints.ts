/** A point on a path with the direction of travel there, in degrees. */
export type PathPoint = { x: number; y: number; angle: number };

type Vec = [number, number];

const cubic = (p0: Vec, p1: Vec, p2: Vec, p3: Vec, t: number): Vec => {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ];
};

/**
 * Samples a path of cubic segments (each [start, control, control, end]) at
 * `count` points evenly spaced along its length, the way CSS offset-path
 * places what travels on it, and measures the whole length for the dash of
 * the trail drawn behind.
 */
export function samplePath(
  segments: [Vec, Vec, Vec, Vec][],
  count: number,
): { points: PathPoint[]; length: number } {
  const fine: Vec[] = [];
  segments.forEach(([p0, p1, p2, p3], index) => {
    for (let i = index === 0 ? 0 : 1; i <= 200; i++) {
      fine.push(cubic(p0, p1, p2, p3, i / 200));
    }
  });
  const lengths = [0];
  for (let i = 1; i < fine.length; i++) {
    lengths.push(
      lengths[i - 1] +
        Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1]),
    );
  }
  const length = lengths[lengths.length - 1];
  const points: PathPoint[] = [];
  let j = 1;
  for (let k = 0; k < count; k++) {
    const target = (length * k) / (count - 1);
    while (j < fine.length - 1 && lengths[j] < target) {
      j++;
    }
    const span = lengths[j] - lengths[j - 1] || 1;
    const f = Math.min(1, Math.max(0, (target - lengths[j - 1]) / span));
    const [ax, ay] = fine[j - 1];
    const [bx, by] = fine[j];
    points.push({
      x: ax + (bx - ax) * f,
      y: ay + (by - ay) * f,
      angle: (Math.atan2(by - ay, bx - ax) * 180) / Math.PI,
    });
  }
  return { points, length };
}
