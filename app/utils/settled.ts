export type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown };

export async function settled<T>(run: () => Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    return { ok: false, error };
  }
}
