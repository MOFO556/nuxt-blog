import type { BlobObject } from "@nuxthub/core/blob";
import type { ItemUploadMeta } from "./core";
import type { Unwrap } from "~~/shared/types/utills";

export type ValidationError = [string, string, [string, string]];

export type Method<T extends Record<string, unknown>, P> = ((data: T) => Promise<P>);

type UploadPayload =
  | File
  | File[]
  | Partial<ItemUploadMeta>[];
  
type UploadMethodResult =
  | UploadMethodResultItem
  | UploadMethodResultItem[];

export type UploadMethod = (
  key: number | null,
  payload: UploadPayload
) => Promise<UploadMethodResult>;

export type UploadMethodWithoutKey = (
  payload: UploadPayload
) => Promise<UploadMethodResult>;

export type UploadMethodResultMap<TFormData> = {
  [K in keyof TFormData as Unwrap<TFormData[K]> extends File[] | File ? K : never]:
    Unwrap<TFormData[K]> extends File[]
      ? (UploadMethodResultItem & ItemUploadMeta & { originalName?: string })[]
      :  Unwrap<TFormData[K]> extends File 
        ? UploadMethodResultItem & ItemUploadMeta & { originalName?: string }
        : never;
};

export type UploadMethodResultItem = { name: string, path: string, id: number };
export type ObjectParamsMethod<T extends Record<string, unknown>, P> = ((data: T) => Promise<P>);
