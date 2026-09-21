import { defineProvider, createOperationsGenerator } from '@nuxt/image/runtime';
import { joinURL, encodePath } from 'ufo';

const operationsGenerator = createOperationsGenerator();

export default defineProvider<{
    baseURL?: string
    ipxBaseURL?: string
  }>({
  getImage(src, { modifiers, ipxBaseURL }) {
    const ipxBase = ipxBaseURL || '/_ipx';
    const operations = operationsGenerator(modifiers) || '_';
    const source = encodePath(src);
    const url = joinURL(ipxBase, operations, source);

    return { url };
  },
})