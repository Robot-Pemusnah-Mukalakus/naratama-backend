import { Prisma } from "@prisma/client";
import express from "express";

import prisma from "../lib/prisma.js";
import { createTransactionMembership, createTransactionRoomBooking } from "#config/midtrans.js";

const router = express.Router();

// POST /api/payment/membership
router.get("/membership", createTransactionMembership);
router.get("/room-booking", createTransactionRoomBooking);

export default router;