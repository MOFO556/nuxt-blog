import { z } from 'zod';
import type { ItemUploadMeta } from '~/types/core';

import type {
  Method, 
  ObjectParamsMethod,
  UploadMethod, 
  UploadMethodResult, 
  UploadMethodResultItem, 
  UploadMethodResultMap, 
  UploadMethodWithoutKey, 
  ValidationError 
} from "~/types/forms";
import type { SingleKeyOfType } from '~~/shared/types/utills';

export const useForm = <TFormData extends Record<string, unknown>, TApiRes extends Record<string, unknown>>(
    _data: TFormData,
    keyField?: SingleKeyOfType<TFormData, number>,
    onFormReqSuccess?: (args: TApiRes) => void,
    schema?: z.ZodSchema
  ) => {

  const data = ref({ ..._data });
  const originalData = { ..._data };
  const errors = reactive<Record<string, string>>({});
  const processing = ref(false);
  const success = ref(false);
  const toast = useToast();
  
  const setError = (field: keyof TFormData, message: string, additionalInfo?: string) => {
    if (field in _data)
      errors[field as string] = `${message}${additionalInfo ? ` ${additionalInfo}` : ''}`;
  };

  const resetErrors = () => {
    Object.keys(errors).forEach((key) => {
      delete errors[key]
    });
  };

  const reset = (...fields: (keyof TFormData)[]) => {
    if (fields.length === 0)
      Object.keys(originalData).forEach((key) => {
        if (data.value[key] instanceof File) {
          data.value[key] = null;
        }
        else {
          data.value[key] = originalData[key];
        }
      });
    else
      fields.forEach((field) => {
        if (data.value[field] instanceof File) {
          data.value[field] = null;
        }
        else {
          data.value[field] = originalData[field];
        }
      });
  };
  
  const handleValidationErrors = (validationErrors: ValidationError[]) => {
    resetErrors();
    validationErrors.forEach((error) => {
      setError(
        error[0], 
        error[1], 
        error[2]?.length 
          ? `should be ${error[2][0]}${!!error[2]?.[1] ? ` - ${error[2][1]}` : ''}`
          : undefined
      )
    })
  };

  function hasFiles(data: TFormData): boolean {
    if (data instanceof File) {
      return true
    }

    if (Array.isArray(data)) {
      return data.some(value => hasFiles(value))
    }

    if (typeof data === 'object' && data !== null) {
      return Object.values(data).some(value => hasFiles(value as unknown as TFormData))
    }

    return false
  };

  const hasFile = ref(hasFiles(data.value));

  watch(
    data.value,
    (newValue: TFormData) => { hasFile.value = hasFiles(newValue) },
    { deep: true },
  );

  const validateForm = async () => {
    resetErrors();
    
    if (!schema) 
      return true;
    
    try {
      await schema.parseAsync(data.value);
      return true;
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        err.format((f) => {
          f.path.forEach(p => {            
            setError(p as keyof TFormData, f.message);
          });
        })
        console.log('Form submit zod error', err.message)
        // err.errors.forEach((error) => {
        //   const field = error.path[0] as string;
        //   errors[field] = error.message;
        // });
      }
      return false;
    }
  };

  const submit = async (
    method: Method<TFormData, TApiRes>, 
    options?: { 
      uploadMethod?: {
        [K in keyof TFormData as TFormData[K] extends File[] 
          ? K 
          : TFormData[K] extends File 
            ? K 
            : never
        ]: UploadMethod | UploadMethodWithoutKey
      },
      onUploadSucseed?: (res: UploadMethodResultMap<TFormData>) => void
    }
    ) => {
    try {
      const { uploadMethod, onUploadSucseed } = options || {};
      const isValid = await validateForm();
      if (!isValid) 
        return;

      const requestData = data.value;
      processing.value = true;
      let uploadedFiles;
      
      if (hasFile.value && !!uploadMethod) {
        const key = typeof requestData[keyField as string] === "number"  
          ? requestData[keyField as string] as number
          : null;
        
        const postUploadProcessing = (resp: UploadMethodResult, itemKey: string) => {
          if (Array.isArray(requestData[itemKey]) && Array.isArray(resp)) {
            const fileMetaRes:(UploadMethodResultItem & ItemUploadMeta & { originalName?: string })[] = [];
            
            requestData[itemKey] = requestData[itemKey].map((d: File & { originalName?: string }) => {
              const fileMeta = resp.find(f => f.name === (d?.originalName || d.name));
              if (fileMeta)
                fileMetaRes.push({...d, ...fileMeta})
              if (fileMeta)
                return { existingPath: fileMeta.path, originalName: fileMeta.name, fileId: fileMeta.id };
              else 
                return d;
            });
            return { [itemKey]: fileMetaRes } 
          } else if (!Array.isArray(resp)){
            return { [itemKey]: { ...requestData[itemKey], existingPath: resp.path, originalName: resp.name, fileId: resp.id } }
          }
        };

        uploadedFiles = (await Promise.all(
          Object.entries(uploadMethod)
          .map(async ([itemKey, uploadMethod]) => {
            if (requestData[itemKey]?.length || requestData[itemKey] instanceof File)
              if (keyField)
                return (uploadMethod as UploadMethod)(key, requestData[itemKey])
                  .then(resp => {
                    return postUploadProcessing(resp, itemKey);
                  })
              else
                return (uploadMethod as UploadMethodWithoutKey)(requestData[itemKey])
                .then(resp => {
                  return postUploadProcessing(resp, itemKey);
                })
          })
          .filter(r => r !== undefined)
          ).catch(err => {
            const validationErrors = err?.data?.data;
            processing.value = false
            if (err?.statusCode === 422 && Array.isArray(validationErrors)) {
              handleValidationErrors(validationErrors)
            }
            return [];
          })
        ).reduce((prev, acc) => {
            return {...prev, ...acc}
          }, {}) || {};
        if (onUploadSucseed !== undefined)
          onUploadSucseed(uploadedFiles as UploadMethodResultMap<TFormData>);
      };
      
      const result = await (method as ObjectParamsMethod<TFormData, TApiRes>)({...requestData, ...uploadedFiles});

      processing.value = false;
      success.value = true;
      
      if (onFormReqSuccess)
        onFormReqSuccess(result);
    }
    catch (err: any) {
      const validationErrors = err.data.data;
      processing.value = false
      if (err.statusCode === 422 && Array.isArray(validationErrors)) {
        handleValidationErrors(validationErrors)
      }
      else {
        toast.add({
          title: "Error",
          color: "error",
          description: `Request processing failed. ${err?.message || err?.data || ''}`,          
        })
      }
    }
    finally {
      processing.value = false
    }
  };

  return reactive({
    ...toRefs(data.value),
    value: data,
    errors,
    processing,
    success,
    reset,
    resetErrors,
    setError,
    submit,
  })

}