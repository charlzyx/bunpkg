import jsesc from 'jsesc';

/**
 * Encodes some data as JSON that may safely be included in HTML.
 */
export default function encodeJSONForScript(data: string) {
  return jsesc(data, { json: true, isScriptContext: true });
}
