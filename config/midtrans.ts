import prisma from "#lib/prisma.js";

import { generateTimestampCode } from "#utils/random.js";


function generatePaymentNumber(): string {
  return `PAY-${generateTimestampCode()}`;
}

const midtransClient = require("midtrans-client");
export const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_ENV === "production",
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
});

export const createTransactionRoomBooking = async (req: any, res: any) => {
const {
  id
} = req.body;

  const paymentNumber = generatePaymentNumber();

  const booking = await prisma.roomBooking.findUnique({
  where: { id },
  include: {
    user: true,
    room: true,
  },
});

if (!booking) {
  return res.status(404).json({ message: "Booking not found" });
}
const parameter = {
  transaction_details: {
    order_id: paymentNumber,
    gross_amount: Math.round(booking.totalCost), // ensure integer
  },
  customer_details: {
    first_name: booking.user?.name ?? "Guest",
    email: booking.user?.email ?? "no-email@example.com",
    phone: booking.user?.phoneNumber ?? "N/A",
  },
  item_details: [
    {
      id: booking.room.id,
      price: Math.round(booking.room.hourlyRate), // ensure integer
      quantity: booking.duration, // already a Float in hours
      name: `Room ${booking.room.name} Booking`,
    },
  ],
};


  try {
    const transaction = await snap.createTransaction(parameter);
    res.status(200).json({
      token: transaction.token,
      redirectUrl: transaction.redirect_url,
    });
  } catch (error) {
    console.error("Midtrans transaction error:", error);
    res.status(500).json({ message: "Failed to create transaction" });
  }
}

export const createTransactionMembership = async (req: any, res: any) => {


}


export const checkTransactionStatus = async (req: any, res: any) => {
  const { orderId } = req.params;
  try {
    const transactionStatus = await snap.transaction.status(orderId);
    res.status(200).json(transactionStatus);
  } catch (error) {
    console.error("Midtrans status check error:", error);
    res.status(500).json({ message: "Failed to check transaction status" });
  }
};