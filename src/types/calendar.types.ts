export type CalendarType = 'personal' | 'team';

export interface AdminCalendar {
  id: string;
  name: string;
  description: string | null;
  calendarImage: string | null;
  calendarUrl: string;
  calendarType: CalendarType;
  calendarColor: string;
  isPublic: boolean;
  subscriberCount: number;
  eventCount: number;
  ownerName: string;
  ownerEmail: string;
  ownerEventUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCalendarSearchParams {
  search?: string;
  type?: CalendarType;
  isPublic?: boolean;
  skip?: number;
  take?: number;
}

export interface AdminCalendarSearchResponse {
  calendars: AdminCalendar[];
  total: number;
  skip: number;
  take: number;
}

export interface AdminUpdateCalendarDto {
  name?: string;
  description?: string;
  isPublic?: boolean;
  calendarType?: CalendarType;
  calendarImage?: string;
}

export interface CalendarStats {
  total: number;
  personal: number;
  team: number;
  public: number;
  private: number;
  totalSubscribers: number;
}
