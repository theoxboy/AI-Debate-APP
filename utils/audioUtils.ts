/**
 * Decodes a base64 string into a Uint8Array.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Manually decodes raw PCM audio data (Int16) into an AudioBuffer.
 * Gemini 2.5 TTS/Live API returns raw PCM 16-bit 24kHz audio.
 */
export function pcmToAudioBuffer(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): AudioBuffer {
  // Safe creation of Int16Array dealing with byte offsets
  // We create a copy if the buffer is not aligned or if we need a specific view
  let dataInt16: Int16Array;
  
  if (data.byteOffset % 2 !== 0 || data.byteLength % 2 !== 0) {
      // Create a aligned copy
      const buffer = new ArrayBuffer(data.byteLength);
      new Uint8Array(buffer).set(data);
      dataInt16 = new Int16Array(buffer);
  } else {
      dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  }

  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
      const sample = dataInt16[i * numChannels + channel];
      // Simple normalization
      channelData[i] = sample < 0 ? sample / 32768.0 : sample / 32767.0;
    }
  }
  return buffer;
}