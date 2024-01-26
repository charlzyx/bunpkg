export default function getContentTypeHeader(type: string) {
  return type === 'application/javascript' ? type + '; charset=utf-8' : type;
}
