export interface EventLocation {
  id: string;
  name: string;
  image: string | null;
  bannerImage: string | null;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  continentId: string;
  continentName: string;
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
  continentId: string;
}

export interface UpdateEventLocationDto {
  name?: string;
  image?: string;
  bannerImage?: string;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
  continentId?: string;
}

export interface EventContinent {
  id: string;
  name: string;
  image: string | null;
  displayOrder: number;
  locationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventContinentDto {
  name: string;
  image?: string;
  displayOrder?: number;
}

export interface UpdateEventContinentDto {
  name?: string;
  image?: string;
  displayOrder?: number;
}
