export interface EventLocation {
  id: string;
  name: string;
  image: string | null;
  bannerImage: string | null;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  eventCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventLocationDto {
  name: string;
  image?: string;
  bannerImage?: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface UpdateEventLocationDto {
  name?: string;
  image?: string;
  bannerImage?: string;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}
