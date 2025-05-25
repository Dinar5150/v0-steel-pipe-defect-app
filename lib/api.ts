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

export async function analyzeImage(imageFile: File, token: string | null): Promise<PredictionResult[]> {
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

    const data = await response.json();
    return data.predictions.map((pred: any, index: number) => ({
      id: index + 1,
      x1: pred.x1,
      y1: pred.y1,
      x2: pred.x2,
      y2: pred.y2,
      conf: pred.confidence,
      cls: pred.class,
      label: pred.label || `Defect ${index + 1}`
    }));
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