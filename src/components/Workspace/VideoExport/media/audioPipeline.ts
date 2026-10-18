import { AudioSampleSink, AudioSampleSource, InputAudioTrack, AudioSample } from 'mediabunny';

export interface PipeClipAudioOptions {
  audioTrack: InputAudioTrack | null;
  audioSource: AudioSampleSource | null;
  inPoint: number;
  outPoint: number;
  outputStartTimestamp: number;
  freezeFrameDuration?: number;
  mapSourceTimeToOutput?: (sourceTime: number) => number;
  audioPolicy?: 'mute' | 'continuous';
  onAudioProgress?: (processedSeconds: number) => void;
  shouldAbort?: () => boolean;
}

/**
 * Pipes audio samples from a source video clip into the destination MP4 audio track.
 * Maps input timestamps [inPoint..outPoint] -> [outputStartTimestamp..outputStartTimestamp + duration].
 * Closes samples after feeding to the encoder to prevent memory leaks.
 */
export async function pipeClipAudio(options: PipeClipAudioOptions): Promise<{
  audioIncluded: boolean;
  samplesAdded: number;
}> {
  const {
    audioTrack,
    audioSource,
    inPoint,
    outPoint,
    outputStartTimestamp,
    freezeFrameDuration = 0,
    mapSourceTimeToOutput,
    audioPolicy = 'mute',
    shouldAbort
  } = options;

  if (!audioTrack || !audioSource) {
    return { audioIncluded: false, samplesAdded: 0 };
  }

  let samplesAdded = 0;

  try {
    const sink = new AudioSampleSink(audioTrack);
    const timeOffset = outputStartTimestamp - inPoint;

    for await (const sample of sink.samples(inPoint, outPoint)) {
      if (shouldAbort && shouldAbort()) {
        sample.close();
        break;
      }

      // Re-timestamp sample to align with video sequence via canonical timeline mapper or linear offset
      const newTimestamp = mapSourceTimeToOutput
        ? Math.max(0, mapSourceTimeToOutput(sample.timestamp))
        : Math.max(0, sample.timestamp + timeOffset);

      // Create new re-timestamped AudioSample from the original sample data
      try {
        const allocation = sample.allocationSize({ planeIndex: 0 });
        const buffer = new ArrayBuffer(allocation * sample.numberOfChannels);
        sample.copyTo(buffer, { planeIndex: 0 });

        const reSample = new AudioSample({
          format: sample.format,
          sampleRate: sample.sampleRate,
          numberOfChannels: sample.numberOfChannels,
          numberOfFrames: sample.numberOfFrames,
          timestamp: newTimestamp,
          data: buffer
        });

        await audioSource.add(reSample);
        samplesAdded++;
      } catch (err) {
        // Fallback: try direct add if sample can be fed directly
        try {
          await audioSource.add(sample);
          samplesAdded++;
        } catch {
          // ignore individual sample error
        }
      } finally {
        sample.close();
      }
    }

    // If freeze frame has continuous audio or silence needed:
    if (freezeFrameDuration > 0 && samplesAdded > 0) {
      // Audio continuous or silence can follow
    }

    return { audioIncluded: samplesAdded > 0, samplesAdded };
  } catch (err) {
    console.warn('Audio piping encountered an error:', err);
    return { audioIncluded: false, samplesAdded };
  }
}
