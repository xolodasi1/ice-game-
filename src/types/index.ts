export interface Game {
  id: string;
  title: string;
  description: string;
  version: string;
  fileUrl: string;
  fileName: string;
  releaseNotes: string;
  views: number;
  downloads: number;
  createdAt: number;
  authorUid: string;
  platform: 'pc' | 'android' | 'both';
  logoUrl?: string;
  previewUrl?: string;
  trailerUrl?: string;
  genre?: string;
  tags?: string[];
  screenshots?: string[];
  fileSize?: number;
  changelog?: string;
  systemRequirements?: {
    os: string;
    cpu: string;
    ram: string;
    gpu: string;
    storage: string;
  };
  androidSystemRequirements?: {
    os: string;
    ram: string;
    storage: string;
  };
  ratings?: { userId: string; score: number }[];
  versions?: { version: string; fileUrl: string; createdAt: number }[];
  likedBy?: string[];
  dislikedBy?: string[];
  developmentProgress?: number;
}
