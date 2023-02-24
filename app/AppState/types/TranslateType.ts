export type TranslateType =
  | string
  | string[]
  | { value: string; text: string }[]
  | { value: boolean; text: string }[]
  | { [key: string]: string[] };
