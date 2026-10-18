import { BlobSource, Input, BufferTarget, Output, Mp4OutputFormat, Conversion } from 'mediabunny';

// Dedicated Background Web Worker for Video Packaging & Transcoding
// Runs completely off the main thread so the UI never hangs or stutters!

self.onmessage = async (e: MessageEvent) => {
  const { type, buffer, mimeType } = e.data;

  if (type === 'CONVERT_TO_MP4') {
    try {
      self.postMessage({ type: 'STATUS', status: 'Worker: Initializing MP4 conversion...' });

      const sourceBlob = new Blob([buffer], { type: mimeType || 'video/webm' });
      const source = new BlobSource(sourceBlob);
      const input = new Input({ source, formats: [] as any });
      const target = new BufferTarget();
      const output = new Output({
        target,
        format: new Mp4OutputFormat()
      });

      const conversion = await Conversion.init({
        input,
        output,
        video: {
          codec: 'avc'
        }
      });

      conversion.onProgress = (ratio: number) => {
        const pct = Math.min(100, Math.max(0, Math.round(ratio * 100)));
        self.postMessage({ type: 'PROGRESS', progress: pct });
      };

      await conversion.execute();

      const outputBuffer = target.buffer;
      if (!outputBuffer || outputBuffer.byteLength === 0) {
        throw new Error("Transcoded MP4 buffer is empty.");
      }

      // Transfer the buffer back to main thread with zero copy
      (self.postMessage as any)(
        { type: 'SUCCESS', buffer: outputBuffer },
        [outputBuffer]
      );
    } catch (err: any) {
      self.postMessage({
        type: 'ERROR',
        error: err?.message || 'Worker conversion failed'
      });
    }
  }
};
