import express from "express";
import {
  createTransactionMembership,
  finishTransactionMembership,
  finishTransactionRoomBooking,
  checkTransactionStatus,
} from "../config/midtrans.js";

const router = express.Router();

// Membership payment routes
router.post("/membership/create", createTransactionMembership);
router.post("/membership/finish", finishTransactionMembership);

// Room booking payment routes
router.post("/room/finish", finishTransactionRoomBooking);

// Transaction status check
router.get("/status/:orderId", checkTransactionStatus);

export default router;
