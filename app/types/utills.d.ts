export type Undefinedable<T> = {
    [P in keyof T]?: T[P];
};

export type KeysOfType<T, V> = {
  [K in keyof T]: NonNullable<T[K]> extends V ? K : never
}[keyof T];

export type SingleKeyOfType<T, V> = KeysOfType<T, V> extends infer K
  ? K extends keyof T
    ? [K] extends [KeysOfType<T, V>] 
      ? K
      : never
    : never
  : never;