export const parseJson = <T>(json: string): T | undefined => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return undefined;
  }
};
