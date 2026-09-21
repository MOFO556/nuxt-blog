import type { BlobObject } from "@nuxthub/core/blob";

export type ValidationError = [string, string, [string, string]];

export type Method<T extends Record<string, unknown>, P> = 
  | ((data: T) => Promise<P>)
  | ((...args: T[]) => Promise<P>);

export type UploadMethod = ((id: number, payload: File[]) => Promise<BlobObject[]>)
  // | ((id: string, payload: File[]) => Promise<BlobObject[]>);

export type ObjectParamsMethod<T extends Record<string, unknown>, P> = ((data: T) => Promise<P>);
export type SpreadParamsMethod<T extends Record<string, unknown>, P> = ((...args: [...keyof T]) => Promise<P>);

interface FormOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: unknown) => void
  onFinish?: () => void
  // headers?: Record<string, string>
  // requestOptions?: {
  //   withCredentials?: boolean
  //   timeout?: number
  //   [key: string]: unknown
  // }
  // fetchOptions?: {
  //   [key: string]: unknown
  // }
}