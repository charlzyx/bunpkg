import type { Transform } from 'stream';

export default function bufferStream(stream: Transform) {
  return new Promise<any>((accept, reject) => {
    const chunks: any[] = [];

    stream
      .on('error', reject)
      .on('data', chunk => chunks.push(chunk))
      .on('end', () => accept(Buffer.concat(chunks)));
  });
}
