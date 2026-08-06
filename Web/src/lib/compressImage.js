/**
 * Compress an image File in the browser before upload.
 * Keeps campus reports light so Details/list load fast.
 */
export async function compressImageFile(file, options = {}) {
  if (!file || !file.type?.startsWith('image/')) return file;

  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.72,
    mimeType = 'image/jpeg',
  } = options;

  // Skip tiny files — already fast enough
  if (file.size > 0 && file.size < 220 * 1024) return file;

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise((resolve) => {
      canvas.toBlob((result) => resolve(result), mimeType, quality);
    });

    if (!blob || blob.size >= file.size) return file;

    const baseName = (file.name || 'item').replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.jpg`, {
      type: mimeType,
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close?.();
  }
}
