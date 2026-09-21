export function appendHeader(headers: HeadersInit, name: string, value: string){
  if (Array.isArray(headers)) {
    headers.push([name, value])
  } else if (headers instanceof Headers) {
    headers.set(name, value)
  } else {
    headers[name] = value;
  }
}