import { analyzeImage } from './aiApi';

export interface ImageAnalysisResult {
  isValid: boolean;
  reason: string;
  confidence: number;
}

// Compress image to reasonable size
async function compressImage(file: File): Promise<File> {
  const MAX_SIZE = 5 * 1024 * 1024;  // 5MB
  
  if (file.size < MAX_SIZE) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;

        // Scale down if needed
        const MAX_DIM = 2000;
        if (w > MAX_DIM || h > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
          w *= ratio;
          h *= ratio;
        }

        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);

        canvas.toBlob((blob) => {
          const compressed = new File([blob!], file.name, { type: 'image/jpeg' });
          resolve(compressed);
        }, 'image/jpeg', 0.75);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Convert file to base64 string
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Analyze plant image using AI
export async function analyzePlantImage(imageFile: File): Promise<ImageAnalysisResult> {
  try {
    console.log('Analyzing image:', imageFile.name);

    const compressed = await compressImage(imageFile);
    console.log('Compressed image');

    const base64 = await fileToBase64(compressed);
    console.log('Converted to base64');
    
    // Call API
    console.log('Sending to API...');
    const startTime = Date.now();
    const data = await analyzeImage(base64);
    const duration = Date.now() - startTime;
    console.log('API response: ' + duration + 'ms -', JSON.stringify(data));

    return {
      isValid: !!data.valid,
      reason: data.reason || (data.valid ? 'Plant verified!' : 'Image rejected'),
      confidence: 95,
    };

  } catch (error) {
    console.error('Analysis error:', error);
    let msg = error instanceof Error ? error.message : 'Could not connect to service';
    
    // Better error messages
    if (msg.includes('timeout')) {
      msg = 'Analysis took too long. Try a smaller image.';
    } else if (msg.includes('Failed to fetch')) {
      msg = 'Network error. Check your connection.';
    } else if (msg.includes('402') || msg.includes('quota')) {
      msg = 'Service quota exceeded. Try again soon.';
    } else if (msg.includes('401') || msg.includes('Unauthorized')) {
      msg = 'Auth error. Reload and try again.';
    } else if (msg.includes('500')) {
      msg = 'Server error. Try again soon.';
    }
    
    return {
      isValid: false,
      reason: msg,
      confidence: 0,
    };
  }
}