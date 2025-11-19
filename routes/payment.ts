import express from "express";
import {
  createTransactionMembership,
  finishTransactionMembership,
  finishTransactionRoomBooking,
  finishTransactionBookLoan,
  checkTransactionStatus,
} from "../config/midtrans.js";

const router = express.Router();

// POST /api/payment/membership/create
router.post("/membership/create", createTransactionMembership);
// POST /api/payment/membership/finish
router.post("/membership/finish", finishTransactionMembership);

// POST /api/payment/room/finish
router.post("/room/finish", finishTransactionRoomBooking);

// POST /api/payment/book/finish
router.post("/book/finish", finishTransactionBookLoan);


// Transaction status check
router.get("/status/:orderId", checkTransactionStatus);

export default router;
