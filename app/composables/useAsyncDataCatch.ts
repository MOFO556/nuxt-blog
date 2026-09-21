export async function useAsyncDataCatch<T>(
  key: string | (() => string),
 handler: any, 
 options?: any
) {
  const {data, error} = await useAsyncData<T>(key, handler, {
    ...options
  })
  
  if(error.value){
    console.log("catched")
    throw createError({
      ...error.value,
      fatal: true
    });
  }

  return data!;
}