# Implementation Summary: Membership-Based System

## ✅ Completed Features

### 1. Global Configuration (`config/limits.ts`)

```typescript
export const USER_LIMITS = {
  MAX_ACTIVE_BOOK_LOANS: 3, // 3 active loans max per user
  MAX_ACTIVE_ROOM_BOOKINGS: 1, // 1 active booking max per user
  DEFAULT_LOAN_DURATION_DAYS: 7, // 7 days loan period
  LATE_FEES_PER_DAY: 5000, // Rp 5,000/day
  COMMITMENT_FEE_BOOK_LOAN: 50000, // Rp 50,000 for non-members
  COMMITMENT_FEE_ROOM_BOOKING: 100000, // Rp 100,000 for non-members
};
```

### 2. Book Loans (`routes/book-loans.ts`)

**Membership Users:**

- ✅ Auto-approve loan (status = `ACTIVE`)
- ✅ No commitment fee required
- ✅ Instant book availability update
- ✅ 7-day loan duration
- ✅ Check max 3 active loans limit

**Non-Membership Users:**

- ✅ Return 402 Payment Required
- ✅ Include payment details with Rp 50k commitment fee
- ✅ Placeholder for Midtrans integration
- ✅ Loan NOT created until payment confirmed

**Response Examples:**

Members (201 Created):

```json
{
  "success": true,
  "membershipApproved": true,
  "message": "Book loan created and auto-approved (active membership)",
  "data": {
    /* loan details */
  }
}
```

Non-Members (402 Payment Required):

```json
{
  "success": false,
  "membershipRequired": false,
  "message": "Payment required. Please complete the commitment fee payment to proceed.",
  "paymentDetails": {
    "type": "COMMITMENT_FEE",
    "amount": 50000,
    "description": "Commitment fee for book loan"
  }
}
```

### 3. Room Bookings (`routes/rooms.ts`)

**Membership Users:**

- ✅ Auto-confirm booking (status = `CONFIRMED`)
- ✅ Auto-mark as paid (paymentStatus = `PAID`)
- ✅ No commitment fee required
- ✅ Check max 1 active booking limit

**Non-Membership Users:**

- ✅ Return 402 Payment Required
- ✅ Include total payment: commitment fee + booking fee
- ✅ Placeholder for Midtrans integration
- ✅ Booking NOT created until payment confirmed

**Response Examples:**

Members (201 Created):

```json
{
  "success": true,
  "membershipApproved": true,
  "message": "Room booked and auto-confirmed (active membership)",
  "data": {
    /* booking details */
  }
}
```

Non-Members (402 Payment Required):

```json
{
  "success": false,
  "membershipRequired": false,
  "message": "Payment required. Please complete the commitment fee and booking fee payment to proceed.",
  "paymentDetails": {
    "type": "ROOM_BOOKING",
    "amount": 300000,
    "commitmentFee": 100000,
    "bookingFee": 200000,
    "description": "Room booking fee + commitment fee"
  }
}
```

### 4. Active Limits Enforcement

**Book Loans:**

```typescript
// Check active loans count
const activeLoanCount = await prisma.bookLoan.count({
  where: {
    userId: userId,
    status: "ACTIVE"
  }
});

if (activeLoanCount >= 3) {
  return 400: "Maximum active book loans reached (3 loans per user)"
}
```

**Room Bookings:**

```typescript
// Check active bookings count
const activeBookingCount = await prisma.roomBooking.count({
  where: {
    userId: userId,
    status: { in: ["PENDING", "CONFIRMED"] }
  }
});

if (activeBookingCount >= 1) {
  return 400: "Maximum active room bookings reached (1 booking per user)"
}
```

### 5. Membership Validation

```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { membership: true },
});

const hasActiveMembership = Boolean(
  user.membership?.isActive && user.membership.endDate > new Date() // Must be active // Must not be expired
);
```

### 6. Bug Fixes

- ✅ Fixed validation target: `"params"` → `"query"` for GET endpoints
- ✅ Fixed transaction timeout issues (pre-calculate dates)
- ✅ Added transaction timeout configuration (10s)
- ✅ Used global constants for fees and limits

---

## 📋 Files Modified

### Created

1. `config/limits.ts` - Global configuration for limits and fees
2. `MEMBERSHIP_SYSTEM.md` - Comprehensive documentation
3. `MEMBERSHIP_IMPLEMENTATION_SUMMARY.md` - This file

### Modified

1. `routes/book-loans.ts`
   - Added membership check logic
   - Added active loan count limit (max 3)
   - Added payment required response for non-members
   - Auto-approve for members
   - Fixed validation target (query)

2. `routes/rooms.ts`
   - Added membership check logic
   - Added active booking count limit (max 1)
   - Added payment required response for non-members
   - Auto-confirm for members
   - Fixed validation target (query)

---

## 🔄 Flow Diagrams

### Book Loan Creation Flow

```
User Requests Loan
       ↓
Check User Exists?
   ↓           ↓
  No          Yes
   ↓           ↓
 404       Check Membership Status
              ↓
      Has Active Membership?
       ↓             ↓
      No            Yes
       ↓             ↓
   Check Limits   Check Limits
       ↓             ↓
   < 3 Loans?    < 3 Loans?
    ↓      ↓      ↓      ↓
   No     Yes    No     Yes
    ↓      ↓      ↓      ↓
   400    402    400  Create Loan
         (Pay)        Auto-Approve
                         ↓
                       201
```

### Room Booking Creation Flow

```
User Requests Booking
       ↓
Check User Exists?
   ↓           ↓
  No          Yes
   ↓           ↓
 404       Check Membership Status
              ↓
      Has Active Membership?
       ↓             ↓
      No            Yes
       ↓             ↓
   Check Limits   Check Limits
       ↓             ↓
   < 1 Booking?  < 1 Booking?
    ↓      ↓      ↓      ↓
   No     Yes    No     Yes
    ↓      ↓      ↓      ↓
   400    402    400  Create Booking
         (Pay)        Auto-Confirm
                         ↓
                       201
```

---

## 🧪 Testing Scenarios

### Test Case 1: Member with Active Membership

```bash
# Prerequisites:
# - User has active membership (endDate > now, isActive = true)
# - User has < 3 active loans
# - Book is available

POST /api/book-loans
{
  "userId": "MEMBER_ID",
  "bookId": "BOOK_ID"
}

# Expected Result:
# - 201 Created
# - Loan status = ACTIVE
# - membershipApproved = true
# - Book availableQuantity decreased
```

### Test Case 2: Non-Member

```bash
# Prerequisites:
# - User has NO membership OR membership is inactive/expired
# - User has < 3 active loans
# - Book is available

POST /api/book-loans
{
  "userId": "NON_MEMBER_ID",
  "bookId": "BOOK_ID"
}

# Expected Result:
# - 402 Payment Required
# - paymentDetails.amount = 50000
# - Loan NOT created
# - Book availableQuantity NOT changed
```

### Test Case 3: Exceed Max Loans

```bash
# Prerequisites:
# - User already has 3 active loans

POST /api/book-loans
{
  "userId": "USER_WITH_3_LOANS",
  "bookId": "BOOK_ID"
}

# Expected Result:
# - 400 Bad Request
# - message = "Maximum active book loans reached (3 loans per user)"
```

### Test Case 4: Member Room Booking

```bash
# Prerequisites:
# - User has active membership
# - User has 0 active bookings
# - Room is available
# - No time slot conflict

POST /api/rooms/bookings
{
  "userId": "MEMBER_ID",
  "roomId": "ROOM_ID",
  "bookingDate": "2024-11-20T00:00:00.000Z",
  "startTime": "2024-11-20T09:00:00.000Z",
  "endTime": "2024-11-20T11:00:00.000Z",
  "purpose": "Meeting"
}

# Expected Result:
# - 201 Created
# - status = CONFIRMED
# - paymentStatus = PAID
# - membershipApproved = true
```

### Test Case 5: Exceed Max Bookings

```bash
# Prerequisites:
# - User already has 1 active booking

POST /api/rooms/bookings
{ /* ... */ }

# Expected Result:
# - 400 Bad Request
# - message = "Maximum active room bookings reached (1 booking per user)"
```

---

## ⏳ TODO: Midtrans Integration

### Steps to Complete

1. **Install Midtrans SDK**

```bash
npm install midtrans-client
```

2. **Add Environment Variables**

```bash
MIDTRANS_SERVER_KEY=your-server-key
MIDTRANS_CLIENT_KEY=your-client-key
MIDTRANS_IS_PRODUCTION=false
```

3. **Create Midtrans Service** (`services/midtrans.ts`)

```typescript
import midtransClient from "midtrans-client";

export const createPaymentToken = async (params: {
  orderId: string;
  amount: number;
  customerDetails: {
    email: string;
    firstName: string;
    phone: string;
  };
}) => {
  const snap = new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
    serverKey: process.env.MIDTRANS_SERVER_KEY!,
    clientKey: process.env.MIDTRANS_CLIENT_KEY!,
  });

  const transaction = await snap.createTransaction({
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.amount,
    },
    customer_details: {
      email: params.customerDetails.email,
      first_name: params.customerDetails.firstName,
      phone: params.customerDetails.phone,
    },
  });

  return transaction.token;
};
```

4. **Update Non-Member Response**

```typescript
const midtransToken = await createPaymentToken({
  orderId: `LOAN-${Date.now()}`,
  amount: USER_LIMITS.COMMITMENT_FEE_BOOK_LOAN,
  customerDetails: {
    email: user.email,
    firstName: user.name,
    phone: user.phoneNumber,
  },
});

return res.status(402).json({
  paymentDetails: {
    midtransToken,
    amount: USER_LIMITS.COMMITMENT_FEE_BOOK_LOAN,
    // ...
  },
});
```

5. **Create Payment Completion Endpoints**

```typescript
// POST /api/book-loans/complete-payment
// POST /api/rooms/bookings/complete-payment
```

6. **Add Midtrans Webhook Handler**

```typescript
// POST /api/payments/midtrans/notification
```

---

## 📊 Database Impact

### Existing Models (No Changes Required)

✅ `User` - Already has `membership` relation  
✅ `Membership` - Already has `isActive`, `endDate`  
✅ `BookLoan` - Already has `status` field  
✅ `RoomBooking` - Already has `status`, `paymentStatus`  
✅ `CommitmentFee` - Already has relations to loans/bookings

### Future Enhancement (Optional)

Consider adding:

```prisma
model PaymentTransaction {
  id              String   @id @default(auto()) @map("_id") @db.ObjectId
  userId          String   @db.ObjectId
  orderId         String   @unique
  amount          Float
  type            String   // COMMITMENT_FEE, BOOKING_FEE, etc.
  status          String   // PENDING, SUCCESS, FAILED
  midtransToken   String?
  paidAt          DateTime?
  createdAt       DateTime @default(now())

  user            User     @relation(fields: [userId], references: [id])
}
```

---

## 🚀 Deployment Checklist

- [ ] Review configuration in `config/limits.ts`
- [ ] Test membership validation logic
- [ ] Test active limits enforcement
- [ ] Verify payment response format
- [ ] Test with different user scenarios
- [ ] Update API documentation
- [ ] Inform frontend team of new response formats
- [ ] Plan Midtrans integration timeline
- [ ] Set up monitoring for payment failures
- [ ] Create admin dashboard for limits management

---

## 📞 Support & Questions

For questions about this implementation:

- See `MEMBERSHIP_SYSTEM.md` for detailed documentation
- Check `config/limits.ts` for configuration values
- Review response examples in this file
- Test with provided curl commands

---

**Implementation Date:** November 17, 2024  
**Status:** ✅ Core Logic Complete, ⏳ Payment Gateway Pending
