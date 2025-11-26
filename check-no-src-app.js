const fs = require('fs');
const path = require('path');

const appDir = path.resolve(__dirname, 'src', 'app');

if (fs.existsSync(appDir)) {
  console.error('Error: The directory src/app/ exists. This is not allowed.');
  process.exit(1);
} else {
  console.log('Success: The directory src/app/ does not exist.');
}   