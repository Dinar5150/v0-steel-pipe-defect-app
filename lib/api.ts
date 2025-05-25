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

export interface SegmentResponse {
  id: number;
  original_url: string;
  mask_text: string;
  report_url: string;
  created_at: string;
}

const CLASS_NAMES = [
  "пора",
  "включение",
  "подрез",
  "прожог",
  "трещина",
  "наплыв",
  "эталон1",
  "эталон2",
  "эталон3",
  "пора-скрытая",
  "утяжина",
  "несплавление",
  "непровар корня"
];

// Helper function to get auth headers
const getAuthHeaders = (token: string | null) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Helper function to decode mask text into segments
export const decodeMaskText = (maskText: string): PredictionResult[] => {
  const segments: PredictionResult[] = [];
  const lines = maskText.split('\n');
  
  lines.forEach((line, index) => {
    const parts = line.trim().split(' ');
    if (parts.length < 3) return; // Skip invalid lines
    
    const classId = parseInt(parts[0]);
    const points = parts.slice(1).map(Number);
    
    // Calculate bounding box from points
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < points.length; i += 2) {
      const x = points[i];
      const y = points[i + 1];
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    
    segments.push({
      id: index + 1,
      x1: minX,
      y1: minY,
      x2: maxX,
      y2: maxY,
      conf: 1.0, // Since we don't have confidence in the mask text
      cls: classId,
      label: CLASS_NAMES[classId] || `Unknown ${classId}`
    });
  });
  
  return segments;
};

export async function analyzeImage(imageFile: File, token: string | null): Promise<{ predictions: PredictionResult[], originalUrl: string }> {
  const formData = new FormData();
  formData.append('file', imageFile);

  try {
    const response = await fetch(`${API_URL}/segment`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: SegmentResponse = await response.json();
    const predictions = decodeMaskText(data.mask_text);
    
    return {
      predictions,
      originalUrl: data.original_url
    };
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
}

// Add function to get user's analysis history
export async function getAnalysisHistory(token: string | null) {
  try {
    const response = await fetch(`${API_URL}/images`, {
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    throw error;
  }
} 