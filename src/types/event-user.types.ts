// Auto-generated from backend DTOs - 2025-11-22
// Source: src/features/user-management/event-user/dto/create-event-user.dto.ts
// Source: src/features/user-management/event-user/dto/event-user-stat.dto.ts
// Source: src/shared/entities/users/eventUser.entity.ts

export interface CreateEventUserDto {
  userId: string;
  organizationName?: string; // Max 255 chars
  bio?: string; // Max 500 chars
  website?: string; // Valid URL, max 255 chars
  twitterHandle?: string; // Max 50 chars
  linkedinUrl?: string; // Valid URL, max 255 chars
  allowEmailNotifications?: boolean; // Default: true
  allowTicketReminders?: boolean; // Default: true
}

export interface UpdateEventUserDto {
  organizationName?: string;
  bio?: string;
  website?: string;
  twitterHandle?: string;
  linkedinUrl?: string;
  allowEmailNotifications?: boolean;
  allowTicketReminders?: boolean;
}

export interface EventUserStatsDto {
  totalEventsCreated: number; // Min: 0
  totalEventsAttended: number; // Min: 0
  totalRevenue: number; // Min: 0
  upcomingEvents: number; // Min: 0
  pastEvents: number; // Min: 0
}

export interface EventUser {
  id: string;
  userId: string; // FK to User
  organizationName?: string;
  bio?: string;
  website?: string;
  twitterHandle?: string;
  linkedinUrl?: string;
  allowEmailNotifications: boolean;
  allowTicketReminders: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string

  // Relations (optional, loaded when needed)
  user?: any; // User
  ownedEvents?: any[]; // Event[]
  guestTickets?: any[]; // GuestTicket[]
  collaborations?: any[]; // EventCollaborator[]
}

export interface EventUserProfileDto {
  user: EventUser;
  stats: EventUserStatsDto;
}
