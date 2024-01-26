export default function createDataURI(contentType: string, content: any) {
  return `data:${contentType};base64,${content.toString('base64')}`;
}
