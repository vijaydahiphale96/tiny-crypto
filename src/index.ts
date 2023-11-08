import fs from 'fs';

const CIRCULAR_SHIFT = 7;
const CHUNK_SIZE = 8; // 64 bits = 8 bytes

function circularShiftLeft(value: bigint, shift: number): bigint {
  return ((value << BigInt(shift)) | (value >> BigInt(64 - shift))) & BigInt("0xFFFFFFFFFFFFFFFF");
}

function bigintToBuffer(value: bigint): Buffer {
  const buffer = Buffer.alloc(CHUNK_SIZE);
  buffer.writeBigUInt64LE(value, 0);
  return buffer;
}

function encryptBuffer(buffer: Buffer): Buffer {
  const bufferLength = buffer.length;
  const encryptedBuffer = Buffer.alloc(bufferLength);

  for (let i = 0; i < bufferLength; i += CHUNK_SIZE) {
    const chunkBuffer = buffer.slice(i, i + CHUNK_SIZE);
    if (chunkBuffer.length < CHUNK_SIZE) {
      // Handle the case where the chunk size is less than 64 bits (e.g., at the end of the file)
      chunkBuffer.copy(encryptedBuffer, i);
    } else {
      const chunk = chunkBuffer.readBigUInt64LE(0);
      const encryptedChunk = circularShiftLeft(chunk, CIRCULAR_SHIFT);
      bigintToBuffer(encryptedChunk).copy(encryptedBuffer, i);
    }
  }

  return encryptedBuffer;
}

function decryptBuffer(buffer: Buffer): Buffer {
  const bufferLength = buffer.length;
  const decryptedBuffer = Buffer.alloc(bufferLength);

  for (let i = 0; i < bufferLength; i += CHUNK_SIZE) {
    const chunkBuffer = buffer.slice(i, i + CHUNK_SIZE);
    if (chunkBuffer.length < CHUNK_SIZE) {
      // Handle the case where the chunk size is less than 64 bits (e.g., at the end of the file)
      chunkBuffer.copy(decryptedBuffer, i);
    } else {
      const encryptedChunk = chunkBuffer.readBigUInt64LE(0);
      const originalChunk = circularShiftLeft(encryptedChunk, 64 - CIRCULAR_SHIFT);
      bigintToBuffer(originalChunk).copy(decryptedBuffer, i);
    }
  }

  return decryptedBuffer;
}

const inputFile = './inputFile/sample.MOV';
const encryptedFile = 'encrypted_video.MOV';
const decryptedFile = 'decrypted_video.MOV';

// Reading the input video file
const videoBuffer = fs.readFileSync(inputFile);

// Encrypt the video file
const encryptedVideoBuffer = encryptBuffer(videoBuffer);

// Write the encrypted video to a new file
fs.writeFileSync(encryptedFile, encryptedVideoBuffer);

// Decrypt the video file
const decryptedVideoBuffer = decryptBuffer(encryptedVideoBuffer);

// Write the decrypted video to a new file
fs.writeFileSync(decryptedFile, decryptedVideoBuffer);

console.log('Video encryption and decryption complete.');
