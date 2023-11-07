import * as fs from 'fs';

const filePath = './inputFile/sample.txt'; // Replace with the path to your file

fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the file:', err);
    return;
  }

  console.log('File content:');
  console.log(data);
});