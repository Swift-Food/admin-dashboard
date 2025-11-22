// Auto-generated from backend DTOs - 2025-11-22
// Source: src/features/event-management/events/dto/create-event.dto.ts
// Source: src/shared/entities/events/event.entity.ts

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

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
