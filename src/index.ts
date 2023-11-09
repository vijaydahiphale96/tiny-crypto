import fs from 'fs';

const CIRCULAR_SHIFT = 7;
const CHUNK_SIZE = 8; // 64 bits = 8 bytes

const s: number[] = [14, 4, 11, 1, 7, 9, 12, 10, 13, 2, 0, 15, 8, 5, 3, 6];

function circularShiftLeft(value: bigint, shift: number): bigint {
  const lower32Bits: bigint = value & BigInt(0xFFFFFFFF);
  const upper32Bits: bigint = (value >> BigInt(32)) & BigInt(0xFFFFFFFF);

  const hexString: string = value.toString(16);
  // const hexE = BigInt("0xE");
  // console.log(hexE); // Output: 14n
  const bigintNumber: bigint = BigInt("0x" + hexString);
  // return ((bigintNumber << BigInt(shift)) | (bigintNumber >> BigInt(64 - shift))) & BigInt("0xFFFFFFFFFFFFFFFF");
  return (sBox(upper32Bits) << BigInt(32)) | sBox(lower32Bits);
}

function sBox(b: bigint): bigint {
  let y: bigint = BigInt(0);

  for (let i = 0; i < 32; i += 4) {
    const  abc = Number((b >> BigInt(i)) & BigInt("0xF"));
    y |= (BigInt(s[abc]) << BigInt(i));
  }

  return y;
}

const s2: number[] = [10, 3, 9, 14, 1, 13, 15, 4, 12, 5, 7, 2, 6, 8, 0, 11];

function circularShiftRight(value: bigint, shift: number): bigint {
  const lower32Bits: bigint = value & BigInt(0xFFFFFFFF);
  const upper32Bits: bigint = (value >> BigInt(32)) & BigInt(0xFFFFFFFF);
  const hexString: string = value.toString(16);
  // const hexE = BigInt("0xE");
  // console.log(hexE); // Output: 14n
  const bigintNumber: bigint = BigInt("0x" + hexString);
  // return ((bigintNumber << BigInt(shift)) | (bigintNumber >> BigInt(64 - shift))) & BigInt("0xFFFFFFFFFFFFFFFF");
  return (sBox2(upper32Bits) << BigInt(32)) | sBox2(lower32Bits);
}

function sBox2(b: bigint): bigint {
  let y: bigint = BigInt(0);

  for (let i = 0; i < 32; i += 4) {
    const  abc = Number((b >> BigInt(i)) & BigInt("0xF"));
    y |= (BigInt(s2[abc]) << BigInt(i));
  }

  return y;
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
      const originalChunk = circularShiftRight(encryptedChunk, 64 - CIRCULAR_SHIFT);
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
