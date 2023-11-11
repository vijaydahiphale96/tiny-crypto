import fs from 'fs';

const CIRCULAR_SHIFT = 7;
const CHUNK_SIZE = 8; // 64 bits = 8 bytes

const s: number[] = [14, 4, 11, 1, 7, 9, 12, 10, 13, 2, 0, 15, 8, 5, 3, 6];

function ANUEncrypt(value: bigint): bigint {
  let lower32Bits: bigint = value & BigInt("0xFFFFFFFF");
  let upper32Bits: bigint = (value >> BigInt(32)) & BigInt("0xFFFFFFFF");

  for(let round = 0; round < 25; round++) {
    upper32Bits = sBox(upper32Bits);
    upper32Bits = upper32Bits ^ (keysList[round][1] & BigInt("0xFFFFFFFF")) ^ rightCircularShift(lower32Bits, 3);
    let temp = lower32Bits ^ ((keysList[round][1] >> BigInt(32)) & BigInt("0xFFFFFFFF")) ^ leftCircularShift(upper32Bits, 10);
    lower32Bits = upper32Bits;
    upper32Bits = temp;
  }

  return (upper32Bits << BigInt(32)) | lower32Bits;
}

function leftCircularShift(value: bigint, shift: number) {
  return ((value << BigInt(shift)) | (value >> BigInt(32 - shift))) & BigInt("0xFFFFFFFF");
}

function rightCircularShift(value: bigint, shift: number) {
  return ((value >> BigInt(shift)) | (value << BigInt(32 - shift))) & BigInt("0xFFFFFFFF");
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

function ANUDecrypt(value: bigint): bigint {
  let lower32Bits: bigint = value & BigInt("0xFFFFFFFF");
  let upper32Bits: bigint = (value >> BigInt(32)) & BigInt("0xFFFFFFFF");

  for(let round = 24; round >= 0; round--) {
    let temp = lower32Bits;
    lower32Bits = upper32Bits ^ ((keysList[round][1] >> BigInt(32)) & BigInt("0xFFFFFFFF")) ^ leftCircularShift(lower32Bits, 10);
    upper32Bits = temp ^ (keysList[round][1] & BigInt("0xFFFFFFFF")) ^ rightCircularShift(lower32Bits, 3);
    upper32Bits = sBox2(upper32Bits);
  }

  return (upper32Bits << BigInt(32)) | lower32Bits;
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
      const encryptedChunk = ANUEncrypt(chunk);
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
      const originalChunk = ANUDecrypt(encryptedChunk);
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

// generate keys

const keysList: any= [];

function generateKeys() {
  const initialKeys = [BigInt(0), BigInt(0)];
  for(let i = 0 ; i<25; i++) {

    keysList.push(initialKeys);
    // console.log("Round - ", i);
    // console.log("Start - ", initialKeys[0].toString(16), initialKeys[1].toString(16));

    const temp = initialKeys[1];
    initialKeys[1]= ((temp<<BigInt(13)) | (initialKeys[0]>>BigInt(64-13))) & BigInt("0xFFFFFFFFFFFFFFFF");
		initialKeys[0]= ((initialKeys[0]<<BigInt(13)) | (temp>>BigInt((64-13)))) & BigInt("0xFFFFFFFFFFFFFFFF");

    const b: bigint = initialKeys[1] & BigInt("0xFF");
    let y: bigint = BigInt(0);
    for (let j = 0; j < 8; j += 4) {
      const  abc = Number((b >> BigInt(j)) & BigInt("0xF"));
      y |= (BigInt(s[abc]) << BigInt(j));
    }
    initialKeys[1] = (initialKeys[1] & BigInt("0xFFFFFFFFFFFFFF00") | y );
    const rc = ((initialKeys[1] >> BigInt(64-5)) & BigInt("0x1F")) ^ BigInt(i);
    initialKeys[1] = (initialKeys[1] & BigInt("0x07FFFFFFFFFFFFFF")) | (rc << BigInt(64-5));
    // console.log("encrypted - ", initialKeys[0].toString(16), initialKeys[1].toString(16));
    // console.log();

  }
}

generateKeys();



// Encrypt the video file
const encryptedVideoBuffer = encryptBuffer(videoBuffer);

// Write the encrypted video to a new file
fs.writeFileSync(encryptedFile, encryptedVideoBuffer);

// Decrypt the video file
const decryptedVideoBuffer = decryptBuffer(encryptedVideoBuffer);

// Write the decrypted video to a new file
fs.writeFileSync(decryptedFile, decryptedVideoBuffer);

console.log('Video encryption and decryption complete.');
