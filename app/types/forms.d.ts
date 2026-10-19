import type { ItemUploadMeta } from "./core";
import type { Unwrap } from "~~/shared/types/utils";

export type ValidationError = [string, string, [string, string]];

export type Method<T extends Record<string, unknown>, P> = (data: T) => Promise<P>;

export type SubmitMethod<TData extends Record<string, unknown>, P> = Method<TData, P>;

export type ObjectParamsMethod<T extends Record<string, unknown>, P> = Method<T, P>;

export type UploadPayload =
  | File
  | File[]
  | Partial<ItemUploadMeta>[];

export type UploadMethodResultItem = { name: string; path: string; id: number };

export type UploadMethodResult =
  | UploadMethodResultItem
  | UploadMethodResultItem[];

export type UploadMethod = (
  key: number | null,
  payload: UploadPayload
) => Promise<UploadMethodResult>;

export type UploadMethodWithoutKey = (
  payload: UploadPayload
) => Promise<UploadMethodResult>;

export type SingleFileUploadMethod = (
  payload: File
) => Promise<UploadMethodResultItem>;

export type UploadedFileField = UploadMethodResultItem & ItemUploadMeta & {
  originalName?: string;
};

export type FileFieldKeys<TFormData> = {
  [K in keyof TFormData]-?: NonNullable<Unwrap<TFormData[K]>> extends File[] | File
    ? K
    : never;
}[keyof TFormData];

export type FormUploadMethods<TFormData> = {
  [K in FileFieldKeys<TFormData>]?:
    | UploadMethod
    | UploadMethodWithoutKey
    | SingleFileUploadMethod;
};

export type UploadMethodResultMap<TFormData> = {
  [K in FileFieldKeys<TFormData>]: NonNullable<Unwrap<TFormData[K]>> extends File[]
    ? UploadedFileField[]
    : UploadedFileField;
};

export type FormSubmitData<TFormData extends Record<string, unknown>> = {
  [K in keyof TFormData]: K extends FileFieldKeys<TFormData>
    ? TFormData[K] | UploadMethodResultMap<TFormData>[Extract<K, FileFieldKeys<TFormData>>]
    : TFormData[K];
};
