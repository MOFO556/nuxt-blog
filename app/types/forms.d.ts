import type { BlobObject } from "@nuxthub/core/blob";

export type ValidationError = [string, string, [string, string]];

export type Method<T extends Record<string, unknown>, P> = 
  | ((data: T) => Promise<P>)
  | ((...args: T[]) => Promise<P>);

export type UploadMethod = ((id: number | null, payload: File[]) => Promise<UploadMethodResultItem[]>)
export type UploadMethodResultItem = {name: string, path: string, id: number};

export type ObjectParamsMethod<T extends Record<string, unknown>, P> = ((data: T) => Promise<P>);
export type SpreadParamsMethod<T extends Record<string, unknown>, P> = ((...args: [...keyof T]) => Promise<P>);
