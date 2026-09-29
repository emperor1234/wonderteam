/**
 * Image helper utility for WonderTeam
 * Strictly enforces and optimizes profile images under 10KB
 */

export const MAX_PROFILE_IMAGE_BYTES = 10240; // 10 KB

export interface ProcessedImage {
  base64: string;
  sizeBytes: number;
  formattedSize: string;
  isWithinLimit: boolean;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Calculates byte size of a base64 or Data URI string
 */
export function getBase64ByteSize(base64String: string): number {
  const parts = base64String.split(',');
  const b64Data = parts[1] || parts[0];
  const padding = (b64Data.endsWith('==') ? 2 : b64Data.endsWith('=') ? 1 : 0);
  return (b64Data.length * (3 / 4)) - padding;
}

/**
 * Automatically downsizes and compresses an image file to strictly fit under 10KB
 */
export async function compressImageUnder10KB(file: File): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image'));
      img.onload = () => {
        // Target dimensions for a crisp 10kb avatar: 120x120 or 96x96
        let maxDim = 128;
        let quality = 0.8;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        let base64 = '';
        let sizeBytes = Infinity;

        // Iterate to guarantee < 10KB
        for (let attempt = 0; attempt < 8; attempt++) {
          let w = img.width;
          let h = img.height;

          if (w > h) {
            if (w > maxDim) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            }
          } else {
            if (h > maxDim) {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          canvas.width = w;
          canvas.height = h;

          // Clear and draw with subtle background for transparent PNGs
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);

          base64 = canvas.toDataURL('image/jpeg', quality);
          sizeBytes = getBase64ByteSize(base64);

          if (sizeBytes <= MAX_PROFILE_IMAGE_BYTES) {
            break;
          }

          // Reduce dimension and quality gradually
          maxDim = Math.max(64, Math.floor(maxDim * 0.82));
          quality = Math.max(0.35, quality - 0.12);
        }

        resolve({
          base64,
          sizeBytes,
          formattedSize: formatBytes(sizeBytes),
          isWithinLimit: sizeBytes <= MAX_PROFILE_IMAGE_BYTES,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
