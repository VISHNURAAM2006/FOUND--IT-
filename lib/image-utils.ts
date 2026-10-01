import { VisualFeatures } from "./ai-matcher";

export interface ProcessedImage {
  dataUrl: string;
  visualFeatures: VisualFeatures;
}

/**
 * Extracts 8x8 spatial luminance grid (shape contours) and 48-bin color histogram
 * directly using the browser's HTML5 Canvas for real-time AI visual embedding.
 */
function extractCanvasVisualFeatures(
  img: HTMLImageElement,
  origWidth: number,
  origHeight: number
): VisualFeatures {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const aspectRatio = parseFloat((origWidth / Math.max(1, origHeight)).toFixed(2));

  if (!ctx) {
    return {
      grid: new Array(64).fill(0.5),
      histogram: new Array(48).fill(1 / 48),
      aspectRatio,
    };
  }

  // 1. 8x8 Spatial Luminance Grid (Shape & Contours - like CNN spatial pooling)
  canvas.width = 8;
  canvas.height = 8;
  ctx.drawImage(img, 0, 0, 8, 8);
  const imgData8 = ctx.getImageData(0, 0, 8, 8);
  const grid: number[] = [];

  for (let i = 0; i < imgData8.data.length; i += 4) {
    const r = imgData8.data[i];
    const g = imgData8.data[i + 1];
    const b = imgData8.data[i + 2];
    // ITU-R BT.601 perceptual luminance
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    grid.push(parseFloat(lum.toFixed(4)));
  }

  // 2. 32x32 Color Histogram (16 R bins, 16 G bins, 16 B bins = 48 dimensions)
  canvas.width = 32;
  canvas.height = 32;
  ctx.drawImage(img, 0, 0, 32, 32);
  const imgData32 = ctx.getImageData(0, 0, 32, 32);

  const rBins = new Array(16).fill(0);
  const gBins = new Array(16).fill(0);
  const bBins = new Array(16).fill(0);
  const totalPixels = 32 * 32;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;

  for (let i = 0; i < imgData32.data.length; i += 4) {
    const r = imgData32.data[i];
    const g = imgData32.data[i + 1];
    const b = imgData32.data[i + 2];
    rSum += r;
    gSum += g;
    bSum += b;

    const rIdx = Math.min(15, Math.floor(r / 16));
    const gIdx = Math.min(15, Math.floor(g / 16));
    const bIdx = Math.min(15, Math.floor(b / 16));
    rBins[rIdx]++;
    gBins[gIdx]++;
    bBins[bIdx]++;
  }

  const histogram = [
    ...rBins.map((v) => parseFloat((v / totalPixels).toFixed(4))),
    ...gBins.map((v) => parseFloat((v / totalPixels).toFixed(4))),
    ...bBins.map((v) => parseFloat((v / totalPixels).toFixed(4))),
  ];

  const avgR = Math.round(rSum / totalPixels);
  const avgG = Math.round(gSum / totalPixels);
  const avgB = Math.round(bSum / totalPixels);
  const dominantColorHex = `#${((1 << 24) + (avgR << 16) + (avgG << 8) + avgB)
    .toString(16)
    .slice(1)}`;

  return {
    grid,
    histogram,
    aspectRatio,
    dominantColorHex,
  };
}

/**
 * Compresses an image File to a lightweight base64 Data URL and extracts AI visual features.
 */
export async function processImageFile(
  file: File,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.8
): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Selected file must be an image"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Extract AI Visual Features from the full image before compression
        const visualFeatures = extractCanvasVisualFeatures(img, width, height);

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            maxHeight = Math.round(maxHeight);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({
            dataUrl: readerEvent.target?.result as string,
            visualFeatures,
          });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve({ dataUrl, visualFeatures });
      };
      img.onerror = () => reject(new Error("Failed to load image for processing"));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}
