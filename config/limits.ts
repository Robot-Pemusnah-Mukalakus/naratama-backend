// Global configuration for user limits

export const USER_LIMITS = {
  // Commitment fee for non-members (in currency units)
  COMMITMENT_FEE_BOOK_LOAN: 25000, // 25k for book loan
  COMMITMENT_FEE_ROOM_BOOKING: 100000, // 100k for room booking

  // Loan duration in days
  DEFAULT_LOAN_DURATION_DAYS: 7,

  // Late fees per day (in currency units)
  LATE_FEES_PER_DAY: 5000,

  // Maximum active book loans per user
  MAX_ACTIVE_BOOK_LOANS: 3,

  // Maximum active room bookings per user
  MAX_ACTIVE_ROOM_BOOKINGS: 1,
} as const;

export const MEMBERSHIP_BENEFITS = {
  // Auto-approve loans and bookings for active members
  AUTO_APPROVE: true,

  // Members don't need to pay commitment fees
  NO_COMMITMENT_FEE: true,
} as const;
