import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Booking schema
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  idNumber: text("id_number").notNull(),
  phoneNumber: text("phone_number"),
  customerNotes: text("customer_notes"),
  roomNumber: integer("room_number").notNull(),
  checkInDate: text("check_in_date").notNull(),
  checkOutDate: text("check_out_date").notNull(),
  totalNights: integer("total_nights").notNull(),
  totalMVR: integer("total_mvr").notNull(),
  totalUSD: text("total_usd").notNull(),
  paymentSlip: text("payment_slip"),
  status: text("status").notNull().default("Pending"),
  adminNotes: text("admin_notes"),
  bookingDate: text("booking_date").notNull(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
}).extend({
  fullName: z.string().min(2, "Full name is required"),
  idNumber: z.string().min(3, "ID/Passport number is required"),
  roomNumber: z.number().min(1).max(10),
  checkInDate: z.string().min(1, "Check-in date is required"),
  checkOutDate: z.string().min(1, "Check-out date is required"),
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// Room type for dropdown
export interface Room {
  number: number;
  name: string;
}

export const ROOMS: Room[] = [
  { number: 1, name: "Room 1" },
  { number: 2, name: "Room 2" },
  { number: 3, name: "Room 3" },
  { number: 4, name: "Room 4" },
  { number: 5, name: "Room 5" },
];

// Bank account details
export interface BankAccount {
  bankName: string;
  mvrAccount: string;
  usdAccount: string;
  accountName: string;
}

export const BANK_ACCOUNTS: BankAccount[] = [
  {
    bankName: "Bank of Maldives",
    mvrAccount: "7777777776666667",
    usdAccount: "7777777776666666",
    accountName: "MOONLIGHT INN",
  },
  {
    bankName: "Maldives Islamic Bank",
    mvrAccount: "99999999888999889",
    usdAccount: "999988887777888888",
    accountName: "MOONLIGHT INN",
  },
];

// Constants
export const DAILY_RATE_MVR = 600;
export const USD_EXCHANGE_RATE = 19.50;
