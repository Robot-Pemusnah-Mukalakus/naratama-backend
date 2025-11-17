import prisma from "#lib/prisma.js";

import { generateTimestampCode } from "#utils/random.js";

function generatePaymentNumber(): string {
  return `PAY-${generateTimestampCode()}`;
}

import midtransClient from "midtrans-client";
export const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_ENV === "production",
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
});

export const createTransactionRoomBooking = async (req: any, res: any) => {
  const { id } = req.body;

  console.log(
    `[PAYMENT] Creating room booking transaction for booking ID: ${id}`
  );

  const paymentNumber = generatePaymentNumber();
  console.log(`[PAYMENT] Generated payment number: ${paymentNumber}`);

  try {
    const booking = await prisma.roomBooking.findUnique({
      where: { id },
      include: {
        user: true,
        room: true,
      },
    });

    if (!booking) {
      console.error(`[PAYMENT ERROR] Booking not found for ID: ${id}`);
      return res.status(404).json({ message: "Booking not found" });
    }

    console.log(
      `[PAYMENT] Found booking: ${JSON.stringify({ id: booking.id, userId: booking.userId, roomId: booking.roomId, totalCost: booking.totalCost })}`
    );

    const parameter = {
      transaction_details: {
        order_id: paymentNumber,
        gross_amount: Math.round(booking.totalCost),
      },
      customer_details: {
        first_name: booking.user?.name ?? "Guest",
        email: booking.user?.email ?? "no-email@example.com",
        phone: booking.user?.phoneNumber ?? "N/A",
      },
      item_details: [
        {
          id: booking.room.id,
          price: Math.round(booking.room.hourlyRate),
          quantity: booking.duration,
          name: `Room ${booking.room.name} Booking`,
        },
      ],
    };

    console.log(
      `[PAYMENT] Midtrans request parameters: ${JSON.stringify(parameter, null, 2)}`
    );

    const transaction = await snap.createTransaction(parameter);

    console.log(
      `[PAYMENT SUCCESS] Room booking transaction created: ${JSON.stringify({ orderId: paymentNumber, token: transaction.token })}`
    );

    return res.status(200).json({
      token: transaction.token,
      redirectUrl: transaction.redirect_url,
    });
  } catch (error) {
    console.error(
      `[PAYMENT ERROR] Room booking transaction failed for booking ID: ${id}`
    );
    console.error(`[PAYMENT ERROR] Error details:`, error);
    console.error(
      `[PAYMENT ERROR] Stack trace:`,
      error instanceof Error ? error.stack : "No stack trace"
    );

    return res.status(500).json({
      message: "Failed to create transaction",
      error:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : "Unknown error"
          : undefined,
    });
  }
};

export const createTransactionMembership = async (req: any, res: any) => {
  const { userId } = req.body;

  console.log(
    `[PAYMENT] Creating membership transaction for user ID: ${userId}`
  );

  if (!userId) {
    console.error(`[PAYMENT ERROR] User ID is missing in request body`);
    return res.status(400).json({
      message: "User ID is required",
      success: false,
    });
  }

  try {
    const paymentNumber = generatePaymentNumber();
    console.log(`[PAYMENT] Generated payment number: ${paymentNumber}`);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        membership: true,
      },
    });

    if (!user) {
      console.error(`[PAYMENT ERROR] User not found for ID: ${userId}`);
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    console.log(
      `[PAYMENT] Found user: ${JSON.stringify({ id: user.id, name: user.name, email: user.email, hasMembership: !!user.membership })}`
    );

    const membershipPrice = 100000;

    const parameter = {
      transaction_details: {
        order_id: paymentNumber,
        gross_amount: membershipPrice,
      },
      customer_details: {
        first_name: user.name ?? "Guest",
        email: user.email ?? "no-email@example.com",
        phone: user.phoneNumber ?? "N/A",
      },
      item_details: [
        {
          id: "MEMBERSHIP_30_DAYS",
          price: membershipPrice,
          quantity: 1,
          name: "Library Membership - 30 Days",
        },
      ],
    };

    console.log(
      `[PAYMENT] Midtrans request parameters: ${JSON.stringify(parameter, null, 2)}`
    );
    console.log(
      `[PAYMENT] Midtrans configuration: ${JSON.stringify({ isProduction: process.env.MIDTRANS_ENV === "production", hasServerKey: !!process.env.MIDTRANS_SERVER_KEY })}`
    );

    const transaction = await snap.createTransaction(parameter);

    console.log(
      `[PAYMENT SUCCESS] Membership transaction created: ${JSON.stringify({ orderId: paymentNumber, token: transaction.token, redirectUrl: transaction.redirect_url })}`
    );

    if (!transaction || !transaction.token) {
      console.error(`[PAYMENT ERROR] Invalid Midtrans response:`, transaction);
      throw new Error("Invalid response from payment gateway");
    }

    return res.status(200).json({
      success: true,
      token: transaction.token,
      redirectUrl: transaction.redirect_url,
      orderId: paymentNumber,
    });
  } catch (error) {
    console.error(
      `[PAYMENT ERROR] Membership transaction failed for user ID: ${userId}`
    );
    console.error(
      `[PAYMENT ERROR] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`
    );
    console.error(
      `[PAYMENT ERROR] Error message:`,
      error instanceof Error ? error.message : error
    );
    console.error(
      `[PAYMENT ERROR] Stack trace:`,
      error instanceof Error ? error.stack : "No stack trace"
    );

    // Log additional error properties if available
    if (error && typeof error === "object") {
      console.error(
        `[PAYMENT ERROR] Error object:`,
        JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const isMidtransError =
      errorMessage.includes("Midtrans") ||
      errorMessage.includes("payment") ||
      errorMessage.includes("API") ||
      errorMessage.includes("ServerKey") ||
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("401");

    console.error(`[PAYMENT ERROR] Is Midtrans error: ${isMidtransError}`);

    return res.status(500).json({
      success: false,
      message: isMidtransError
        ? "Payment gateway error. Please check your Midtrans configuration."
        : "Failed to create membership transaction",
      error: process.env.NODE_ENV === "development" ? errorMessage : undefined,
    });
  }
};

export const checkTransactionStatus = async (req: any, res: any) => {
  const { orderId } = req.params;

  console.log(`[PAYMENT] Checking transaction status for order ID: ${orderId}`);

  try {
    const transactionStatus = await snap.transaction.status(orderId);

    console.log(
      `[PAYMENT SUCCESS] Transaction status retrieved: ${JSON.stringify({ orderId, status: transactionStatus.transaction_status, fraudStatus: transactionStatus.fraud_status })}`
    );

    return res.status(200).json(transactionStatus);
  } catch (error) {
    console.error(
      `[PAYMENT ERROR] Status check failed for order ID: ${orderId}`
    );
    console.error(`[PAYMENT ERROR] Error details:`, error);
    console.error(
      `[PAYMENT ERROR] Stack trace:`,
      error instanceof Error ? error.stack : "No stack trace"
    );

    return res.status(500).json({
      message: "Failed to check transaction status",
      error:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : "Unknown error"
          : undefined,
    });
  }
};
