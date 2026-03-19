/**
 * Compress images in the photoshoot folder using Sharp.
 * Reduces file size while preserving visual quality.
 *
 * Usage: npx ts-node scripts/compress-photoshoot.ts
 * Or:    npm run compress-photoshoot
 */

import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

const PHOTOSHOOT_DIR = path.join(__dirname, "../photoshoot");
const OUTPUT_DIR = path.join(__dirname, "../photoshoot-compressed");

/** JPEG quality (80–90 balances size vs quality; 85 is visually near-lossless). */
const JPEG_QUALITY = 85;

/** Max dimension (px); images larger than this are resized to reduce size. Set to Infinity to skip resize. */
const MAX_DIMENSION = 1920;

/** Supported image extensions. */
const IMAGE_EXT = /\.(jpg|jpeg|png|webp|tiff?)$/i;

async function compressImage(inputPath: string, outputPath: string): Promise<{ original: number; compressed: number }> {
  const originalStats = fs.statSync(inputPath);
  const ext = path.extname(inputPath).toLowerCase();

  let pipeline = sharp(inputPath);

  // Resize if larger than max dimension (preserves aspect ratio)
  const metadata = await pipeline.metadata();
  const { width = 0, height = 0 } = metadata;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  // Output format: JPEG for photos (best compression), preserve format for others
  if (ext.match(/\.(jpg|jpeg)$/)) {
    pipeline = pipeline.jpeg({
      quality: JPEG_QUALITY,
      mozjpeg: true, // Better compression at same quality
    });
  } else if (ext === ".png") {
    pipeline = pipeline.png({
      compressionLevel: 9,
      effort: 10,
    });
  } else if (ext === ".webp") {
    pipeline = pipeline.webp({
      quality: JPEG_QUALITY,
      effort: 6,
    });
  } else {
    // TIFF etc. → convert to JPEG for smaller size
    pipeline = pipeline.jpeg({
      quality: JPEG_QUALITY,
      mozjpeg: true,
    });
  }

  const outExt = ext.match(/\.(jpg|jpeg)$/) ? ".jpg" : ext;
  const finalOutput = outputPath.replace(/\.[^.]+$/i, outExt);

  await pipeline.toFile(finalOutput);
  const compressedStats = fs.statSync(finalOutput);

  return { original: originalStats.size, compressed: compressedStats.size };
}

async function main() {
  if (!fs.existsSync(PHOTOSHOOT_DIR)) {
    console.error(`Photoshoot folder not found: ${PHOTOSHOOT_DIR}`);
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const files = fs.readdirSync(PHOTOSHOOT_DIR);
  const imageFiles = files.filter((f) => IMAGE_EXT.test(f));

  if (imageFiles.length === 0) {
    console.log("No image files found in photoshoot folder.");
    return;
  }

  console.log(`Compressing ${imageFiles.length} images...`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  let totalOriginal = 0;
  let totalCompressed = 0;

  for (const file of imageFiles) {
    const inputPath = path.join(PHOTOSHOOT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file);

    try {
      const { original, compressed } = await compressImage(inputPath, outputPath);
      totalOriginal += original;
      totalCompressed += compressed;
      const pct = ((1 - compressed / original) * 100).toFixed(1);
      console.log(`  ${file}: ${(original / 1024).toFixed(1)} KB → ${(compressed / 1024).toFixed(1)} KB (-${pct}%)`);
    } catch (err) {
      console.error(`  ${file}: ERROR`, err);
    }
  }

  const totalSaved = totalOriginal - totalCompressed;
  const totalPct = totalOriginal > 0 ? ((totalSaved / totalOriginal) * 100).toFixed(1) : "0";
  console.log(`\nDone. Total: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB → ${(totalCompressed / 1024 / 1024).toFixed(2)} MB (saved ${totalPct}%)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
