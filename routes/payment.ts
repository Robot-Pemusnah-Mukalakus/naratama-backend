import { Prisma } from "@prisma/client";
import express from "express";

import prisma from "../lib/prisma.js";
import { createTransactionMembership, createTransactionRoomBooking, finishTransactionMembership } from "#config/midtrans.js";

const router = express.Router();

// POST /api/payment/membership
router.post("/membership", createTransactionMembership);
router.post("/membership/finish", finishTransactionMembership);
router.post("/room-booking", createTransactionRoomBooking);

export default router;