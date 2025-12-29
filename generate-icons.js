import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgPath = path.join(__dirname, 'public', 'icons', 'icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

const sizes = [16, 48, 128];

async function generateIcons() {
    for (const size of sizes) {
        const outputPath = path.join(__dirname, 'public', 'icons', `icon${size}.png`);
        await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toFile(outputPath);
        console.log(`Generated icon${size}.png`);
    }
    console.log('All icons generated!');
}

generateIcons().catch(console.error);
