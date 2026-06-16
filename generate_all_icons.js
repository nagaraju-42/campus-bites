const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateAllIcons() {
  const sourceImage = 'C:\\Users\\NAGARAJU\\.gemini\\antigravity\\brain\\7ec59eb2-079d-499a-ba95-0cc9af9a3c85\\dinendeliver_logo_1781451850501.png';
  const iconsDir = path.join(__dirname, 'public', 'icons');
  const publicDir = path.join(__dirname, 'public');

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  try {
    // 192x192 PWA Icon
    await sharp(sourceImage)
      .resize(192, 192)
      .png({ quality: 90 })
      .toFile(path.join(iconsDir, 'icon-192x192.png'));
    console.log('Created icon-192x192.png');

    // 512x512 PWA Icon
    await sharp(sourceImage)
      .resize(512, 512)
      .png({ quality: 90 })
      .toFile(path.join(iconsDir, 'icon-512x512.png'));
    console.log('Created icon-512x512.png');

    // Apple Touch Icon
    await sharp(sourceImage)
      .resize(180, 180)
      .png({ quality: 90 })
      .toFile(path.join(publicDir, 'apple-icon.png'));
    console.log('Created apple-icon.png');

    // Favicon (just a 32x32 png saved as .ico for modern browsers or simple png)
    // For simplicity, we can save a 32x32 png, but name it favicon.ico or just make a small icon
    await sharp(sourceImage)
      .resize(32, 32)
      .png({ quality: 100 })
      .toFile(path.join(publicDir, 'favicon.ico'));
    console.log('Created favicon.ico');

    // Also save the main logo for reference in the public folder
    await sharp(sourceImage)
      .toFile(path.join(publicDir, 'logo.png'));
    console.log('Created main logo.png');

  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateAllIcons();
