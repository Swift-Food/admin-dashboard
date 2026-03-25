// Auto-generated from backend DTOs - 2025-11-22
// Source: src/features/event-management/events/dto/create-event.dto.ts
// Source: src/shared/entities/events/event.entity.ts

export type EventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';

export const EventStatus = {
  DRAFT: 'draft' as const,
  PUBLISHED: 'published' as const,
  ONGOING: 'ongoing' as const,
  COMPLETED: 'completed' as const,
  CANCELLED: 'cancelled' as const,
};

export interface CreateEventDto {
  name: string;
  description: string;
  eventImage?: string;
  eventColor?: string; // Hex color, default: '#6366f1'
  ownerEventUserId: string;
  startDateTime: Date | string;
  endDateTime: Date | string;
  status?: EventStatus;
  isPrivate?: boolean;
  addressId?: string;
  cateringOrderId?: string;
  eventUrl?: string;
}

export interface UpdateEventDto {
  name?: string;
  description?: string;
  eventImage?: string;
  eventColor?: string;
  startDateTime?: Date | string;
  endDateTime?: Date | string;
  status?: EventStatus;
  isPrivate?: boolean;
  addressId?: string;
  cateringOrderId?: string;
  eventUrl?: string;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  eventImage: string;
  eventColor: string; // Hex color
  ownerEventUserId: string;
  startDateTime: string; // ISO date string
  endDateTime: string; // ISO date string
  status: EventStatus;
  isPrivate: boolean;
  addressId?: string;
  cateringOrderId?: string;
  eventUrl?: string;
  viewCount: number;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string

  // Relations (optional, loaded when needed)
  owner?: any; // EventUser
  address?: any; // Address
  eventTickets?: any[]; // EventTicket[]
  categories?: any[]; // EventCategory[]
  cateringOrder?: any; // CateringOrder
  guestTickets?: any[]; // GuestTicket[]
  collaborators?: any[]; // EventCollaborator[]
}

// Admin dashboard types
export interface AdminEvent {
  id: string;
  name: string;
  description: string;
  eventImage: string | null;
  status: EventStatus;
  isPrivate: boolean;
  startDateTime: string;
  endDateTime: string;
  ownerName: string;
  ownerEmail: string;
  ownerEventUserId: string;
  ticketCount: number;
  guestCount: number;
  locationNames: string[];
  continentNames: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminEventSearchParams {
  search?: string;
  status?: EventStatus;
  locationId?: string;
  continentId?: string;
  startDate?: string;
  endDate?: string;
  skip?: number;
  take?: number;
}

export interface AdminEventSearchResponse {
  events: AdminEvent[];
  total: number;
  skip: number;
  take: number;
}

export interface AdminUpdateEventDto {
  name?: string;
  description?: string;
  status?: EventStatus;
  eventImage?: string;
  locationIds?: string[];
}

export interface EventStats {
  total: number;
  published: number;
  draft: number;
  cancelled: number;
  completed: number;
}
