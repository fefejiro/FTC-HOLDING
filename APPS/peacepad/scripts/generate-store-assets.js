import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const STORE_ASSETS_DIR = './store-assets';

// Ensure output directory exists
if (!fs.existsSync(STORE_ASSETS_DIR)) {
  fs.mkdirSync(STORE_ASSETS_DIR, { recursive: true });
}

// PeacePad brand colors
const PRIMARY_COLOR = { r: 155, g: 109, b: 210 }; // #9B6DD2 - hsl(262, 70%, 68%)
const DARKER_PURPLE = { r: 123, g: 77, b: 178 }; // #7B4DB2

async function createAppIcon() {
  console.log('Creating 512x512 app icon...');
  
  const sourceIcon = './android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png';
  const outputPath = path.join(STORE_ASSETS_DIR, 'app-icon-512x512.png');
  
  await sharp(sourceIcon)
    .resize(512, 512, { fit: 'contain', background: { r: 155, g: 109, b: 210, alpha: 1 } })
    .png()
    .toFile(outputPath);
  
  console.log(`  Created: ${outputPath}`);
}

async function createFeatureGraphic() {
  console.log('Creating 1024x500 feature graphic...');
  
  const width = 1024;
  const height = 500;
  
  // Create gradient background using SVG
  const svgGradient = `
    <svg width="${width}" height="${height}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#9B6DD2;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#7B4DB2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <text x="50%" y="42%" text-anchor="middle" fill="white" font-size="72" font-weight="bold" font-family="Arial, sans-serif">PeacePad</text>
      <text x="50%" y="56%" text-anchor="middle" fill="white" font-size="36" font-family="Arial, sans-serif">Family Connect</text>
      <text x="50%" y="70%" text-anchor="middle" fill="white" font-size="24" font-family="Arial, sans-serif" opacity="0.9">Communicate Clearly. Reduce Conflict.</text>
    </svg>
  `;
  
  const outputPath = path.join(STORE_ASSETS_DIR, 'feature-graphic-1024x500.png');
  
  await sharp(Buffer.from(svgGradient))
    .png()
    .toFile(outputPath);
  
  console.log(`  Created: ${outputPath}`);
}

async function createPhoneScreenshot(title, outputName) {
  console.log(`Creating phone screenshot: ${outputName}...`);
  
  const width = 1080;
  const height = 1920;
  
  const svg = `
    <svg width="${width}" height="${height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#9B6DD2"/>
          <stop offset="100%" style="stop-color:#7B4DB2"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      
      <!-- Title -->
      <text x="50%" y="100" text-anchor="middle" fill="white" font-size="48" font-weight="bold" font-family="Arial, sans-serif">${title}</text>
      
      <!-- Phone frame -->
      <rect x="90" y="180" width="900" height="1620" rx="60" fill="#1a1a1a"/>
      
      <!-- Phone screen -->
      <rect x="110" y="240" width="860" height="1500" rx="40" fill="white"/>
      
      <!-- Screen content -->
      <text x="540" y="600" text-anchor="middle" fill="#9B6DD2" font-size="48" font-weight="bold" font-family="Arial, sans-serif">PeacePad</text>
      <text x="540" y="680" text-anchor="middle" fill="#666666" font-size="32" font-family="Arial, sans-serif">${title}</text>
      
      <!-- Feature icon -->
      <circle cx="540" cy="900" r="120" fill="#9B6DD2" opacity="0.2"/>
      <circle cx="540" cy="900" r="80" fill="#9B6DD2" opacity="0.4"/>
      <circle cx="540" cy="900" r="40" fill="#9B6DD2"/>
    </svg>
  `;
  
  const outputPath = path.join(STORE_ASSETS_DIR, outputName);
  
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
  
  console.log(`  Created: ${outputPath}`);
}

async function createTabletScreenshot(title, outputName, width, height) {
  console.log(`Creating tablet screenshot: ${outputName}...`);
  
  const isLandscape = width > height;
  const titleSize = Math.floor(Math.min(width, height) * 0.04);
  const brandSize = Math.floor(Math.min(width, height) * 0.06);
  
  const svg = `
    <svg width="${width}" height="${height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#9B6DD2"/>
          <stop offset="100%" style="stop-color:#7B4DB2"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      
      <!-- Title -->
      <text x="50%" y="${height * 0.08}" text-anchor="middle" fill="white" font-size="${titleSize}" font-weight="bold" font-family="Arial, sans-serif">${title}</text>
      
      <!-- Tablet frame -->
      <rect x="${width * 0.05}" y="${height * 0.12}" width="${width * 0.9}" height="${height * 0.82}" rx="30" fill="#1a1a1a"/>
      
      <!-- Tablet screen -->
      <rect x="${width * 0.06}" y="${height * 0.14}" width="${width * 0.88}" height="${height * 0.78}" rx="20" fill="white"/>
      
      <!-- Screen content -->
      <text x="50%" y="45%" text-anchor="middle" fill="#9B6DD2" font-size="${brandSize}" font-weight="bold" font-family="Arial, sans-serif">PeacePad</text>
      <text x="50%" y="55%" text-anchor="middle" fill="#666666" font-size="${titleSize}" font-family="Arial, sans-serif">Family Connect</text>
    </svg>
  `;
  
  const outputPath = path.join(STORE_ASSETS_DIR, outputName);
  
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
  
  console.log(`  Created: ${outputPath}`);
}

async function main() {
  console.log('Generating PeacePad Store Assets...\n');
  
  // 1. App Icon
  await createAppIcon();
  
  // 2. Feature Graphic
  await createFeatureGraphic();
  
  // 3. Phone Screenshots (1080x1920)
  const phoneScreens = [
    { name: 'phone-screenshot-1-welcome.png', title: 'Communicate Clearly' },
    { name: 'phone-screenshot-2-conch.png', title: 'Conch Mode' },
    { name: 'phone-screenshot-3-messaging.png', title: 'Family Messaging' },
    { name: 'phone-screenshot-4-calendar.png', title: 'Shared Calendar' },
    { name: 'phone-screenshot-5-expenses.png', title: 'Expense Tracking' },
    { name: 'phone-screenshot-6-support.png', title: 'Find Support' },
  ];
  
  for (const screen of phoneScreens) {
    await createPhoneScreenshot(screen.title, screen.name);
  }
  
  // 4. 7-inch Tablet Screenshots (600x960)
  await createTabletScreenshot('Communicate Clearly', 'tablet-7inch-1-welcome.png', 600, 960);
  await createTabletScreenshot('Family Organization', 'tablet-7inch-2-features.png', 600, 960);
  
  // 5. 10-inch Tablet Screenshots (1200x1920)
  await createTabletScreenshot('Communicate Clearly', 'tablet-10inch-1-welcome.png', 1200, 1920);
  await createTabletScreenshot('Family Organization', 'tablet-10inch-2-features.png', 1200, 1920);
  
  // 6. Chromebook Screenshots (1920x1080 landscape)
  await createTabletScreenshot('Communicate Clearly', 'chromebook-1-welcome.png', 1920, 1080);
  await createTabletScreenshot('Family Messaging', 'chromebook-2-messaging.png', 1920, 1080);
  await createTabletScreenshot('Shared Calendar', 'chromebook-3-calendar.png', 1920, 1080);
  await createTabletScreenshot('Expense Tracking', 'chromebook-4-expenses.png', 1920, 1080);
  
  console.log('\nAll store assets generated in ./store-assets/');
  console.log('\nAsset Summary:');
  console.log('  - app-icon-512x512.png (App Icon)');
  console.log('  - feature-graphic-1024x500.png (Feature Graphic)');
  console.log('  - phone-screenshot-*.png (6 Phone Screenshots)');
  console.log('  - tablet-7inch-*.png (2 7-inch Tablet Screenshots)');
  console.log('  - tablet-10inch-*.png (2 10-inch Tablet Screenshots)');
  console.log('  - chromebook-*.png (4 Chromebook Screenshots)');
}

main().catch(console.error);
