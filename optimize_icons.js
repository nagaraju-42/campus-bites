const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimizeIcons() {
  const iconsDir = path.join(__dirname, 'public', 'icons');
  const icon192 = path.join(iconsDir, 'icon-192x192.png');
  const icon512 = path.join(iconsDir, 'icon-512x512.png');

  if (fs.existsSync(icon192)) {
    const temp192 = path.join(iconsDir, 'temp-192.png');
    await sharp(icon192).resize(192, 192).png({ quality: 80, compressionLevel: 9 }).toFile(temp192);
    fs.renameSync(temp192, icon192);
    console.log(`Optimized 192x192. New size: ${fs.statSync(icon192).size / 1024} KB`);
  }

  if (fs.existsSync(icon512)) {
    const temp512 = path.join(iconsDir, 'temp-512.png');
    await sharp(icon512).resize(512, 512).png({ quality: 80, compressionLevel: 9 }).toFile(temp512);
    fs.renameSync(temp512, icon512);
    console.log(`Optimized 512x512. New size: ${fs.statSync(icon512).size / 1024} KB`);
  }
}

optimizeIcons().catch(console.error);
