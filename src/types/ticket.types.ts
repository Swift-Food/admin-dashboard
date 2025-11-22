// Auto-generated from backend DTOs - 2025-11-22
// Source: src/features/event-management/tickets/dto/create-ticket.dto.ts
// Source: src/shared/entities/events/event-ticket.entity.ts

export interface QuestionBlock {
  question: string;
  type: 'shortText' | 'longText' | 'multiSelect' | 'singleSelect';
  options?: string[];
  required: boolean;
}

export interface CreateTicketDto {
  eventId: string;
  name: string;
  description?: string;
  price: number; // Decimal, 2 decimal places
  isSingleUse?: boolean; // Default: true
  quantityTotal: number;
  questionForm?: QuestionBlock[]; // Max 20 questions
  isPrivate?: boolean;
  autoApprovalGuestEmails?: string[]; // Max 100 emails
  salesStartDate?: Date | string;
  salesEndDate?: Date | string;
}

export interface UpdateTicketDto {
  name?: string;
  description?: string;
  price?: number;
  isSingleUse?: boolean;
  quantityTotal?: number;
  questionForm?: QuestionBlock[];
  isPrivate?: boolean;
  autoApprovalGuestEmails?: string[];
  salesStartDate?: Date | string;
  salesEndDate?: Date | string;
}

export interface EventTicket {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  price: number; // Decimal
  isSingleUse: boolean;
  quantityTotal: number;
  quantitySold: number;
  quantityLeft: number; // Computed: quantityTotal - quantitySold
  questionForm?: QuestionBlock[];
  isPrivate: boolean;
  autoApprovalGuestEmails: string[];
  salesStartDate?: string; // ISO date string
  salesEndDate?: string; // ISO date string
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string

  // Relations (optional, loaded when needed)
  event?: any; // Event
  guestTickets?: any[]; // GuestTicket[]
}
