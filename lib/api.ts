const API_URL = 'http://localhost:8000';

export interface PredictionResult {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  conf: number;
  cls: number;
  label: string;
}

export async function analyzeImage(imageFile: File): Promise<PredictionResult[]> {
  const formData = new FormData();
  formData.append('file', imageFile);

  try {
    const response = await fetch(`${API_URL}/predict`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    const lines = text.trim().split('\n');
    
    // Skip header line
    const dataLines = lines.slice(1);
    
    return dataLines.map((line, index) => {
      const [x1, y1, x2, y2, conf, cls] = line.split(' ').map(Number);
      return { 
        id: index + 1,
        x1, 
        y1, 
        x2, 
        y2, 
        conf, 
        cls,
        label: `Defect ${index + 1}`
      };
    });
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
} 