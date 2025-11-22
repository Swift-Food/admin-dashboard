// Auto-generated from backend DTOs - 2025-11-22
// Source: src/features/order-management/catering/dto/shared-access.dto.ts

export type SharedAccessRole = 'viewer' | 'manager';

export const SharedAccessRole = {
  VIEWER: 'viewer' as const,
  MANAGER: 'manager' as const,
};

// Auto-generated from backend DTOs - 2025-11-22
// Source: src/features/order-management/catering/dto/shared-access.dto.ts

export interface AddSharedAccessDto {
  orderId: string;
  email: string; // Valid email format
  name: string;
  role: SharedAccessRole;
  userId?: string; // Optional
}

// Auto-generated from backend DTOs - 2025-11-22
// Source: src/features/order-management/catering/dto/shared-access.dto.ts

export interface RemoveSharedAccessDto {
  orderId: string;
  email: string; // Valid email format
}

// Auto-generated from backend DTOs - 2025-11-22
// Source: src/features/order-management/catering/dto/shared-access.dto.ts

export interface UpdateSharedAccessRoleDto {
  orderId: string;
  email: string; // Valid email format
  newRole: SharedAccessRole;
}

// Auto-generated from backend DTOs - 2025-11-22
// Source: src/features/order-management/catering/dto/shared-access.dto.ts

export interface UpdatePickupContactDto {
  orderId: string;
  pickupContactName: string;
  pickupContactPhone: string;
  pickupContactEmail: string; // Valid email format
  userId?: string; // Optional
  accessToken?: string; // Optional
}

// Auto-generated from backend DTOs - 2025-11-22
// Source: src/features/order-management/catering/dto/shared-access.dto.ts

export interface UpdateDeliveryTimeDto {
  orderId: string;
  newEventTime: string;
  newCollectionTime?: string; // Optional
  userId?: string; // Optional
  accessToken?: string; // Optional
}
