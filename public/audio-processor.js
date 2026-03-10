/**
 * AudioWorklet processor for capturing microphone audio and converting to
 * PCM16 format (16-bit signed LE, 24kHz mono) for the OpenAI Realtime API.
 *
 * Browser mic audio arrives at the native sample rate (typically 48kHz).
 * This processor downsamples to 24kHz using linear interpolation and
 * converts float32 [-1, 1] to int16 [-32768, 32767].
 *
 * Posts ArrayBuffer chunks (~100ms each) to the main thread via port.postMessage.
 */
class RealtimeAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._inputSampleRate = sampleRate; // from AudioWorkletGlobalScope
    this._outputSampleRate = 24000;
    this._ratio = this._inputSampleRate / this._outputSampleRate;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channel = input[0]; // mono

    // Accumulate float32 samples
    for (let i = 0; i < channel.length; i++) {
      this._buffer.push(channel[i]);
    }

    // Process when we have enough for ~100ms at 24kHz (2400 output samples)
    const outputChunkSize = 2400;
    const inputChunkSize = Math.floor(outputChunkSize * this._ratio);

    while (this._buffer.length >= inputChunkSize) {
      const sourceChunk = this._buffer.splice(0, inputChunkSize);
      const pcm16 = new Int16Array(outputChunkSize);

      for (let i = 0; i < outputChunkSize; i++) {
        const srcIdx = i * this._ratio;
        const idx = Math.floor(srcIdx);
        const frac = srcIdx - idx;

        let sample;
        if (idx + 1 < sourceChunk.length) {
          // Linear interpolation between adjacent samples
          sample = sourceChunk[idx] * (1 - frac) + sourceChunk[idx + 1] * frac;
        } else {
          sample = sourceChunk[idx] || 0;
        }

        // Clamp and convert to int16
        sample = Math.max(-1, Math.min(1, sample));
        pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      }

      // Transfer the buffer to main thread (transferable for zero-copy)
      this.port.postMessage({ type: "audio", buffer: pcm16.buffer }, [pcm16.buffer]);
    }

    return true;
  }
}

registerProcessor("realtime-audio-processor", RealtimeAudioProcessor);
