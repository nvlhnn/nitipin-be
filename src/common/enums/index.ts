export enum TripType {
  INTERNATIONAL = 'international',
  DOMESTIC = 'domestic',
}

export enum TripStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum RequestStatus {
  OPEN = 'open',
  MATCHED = 'matched',
  FULFILLED = 'fulfilled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum OfferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PURCHASED = 'purchased',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
  REFUNDED = 'refunded',
}

export enum DisputeStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  RESOLVED_REFUND = 'resolved_refund',
  RESOLVED_NO_REFUND = 'resolved_no_refund',
  CLOSED = 'closed',
}

export enum NotificationType {
  ORDER_UPDATE = 'order_update',
  NEW_OFFER = 'new_offer',
  OFFER_UPDATE = 'offer_update',
  WALLET_CREDIT = 'wallet_credit',
  WALLET_WITHDRAWAL = 'wallet_withdrawal',
  DISPUTE_UPDATE = 'dispute_update',
  SYSTEM = 'system',
}

export enum TransactionType {
  CREDIT = 'credit',
  WITHDRAWAL = 'withdrawal',
  REFUND = 'refund',
}

export enum WithdrawalStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  SYSTEM = 'system',
}

export enum UserType {
  TRAVELER = 'traveler',
  REQUESTER = 'requester',
}
