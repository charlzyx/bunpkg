import { createElement } from 'react';

export { createElement };

export function createHTML(code: string) {
  return { __html: code };
}

export function createScript(script: string) {
  return createElement('script', {
    dangerouslySetInnerHTML: createHTML(script)
  });
}
