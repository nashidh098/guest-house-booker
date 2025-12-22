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
  roomNumber: z.number().min(1).max(4),
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
  // Rooms 3 and 4 - coming soon (not completed yet)
];

// Bank account details
export interface BankAccount {
  bankName: string;
  mvrAccount: string | null;
  usdAccount: string | null;
  accountName: string;
}

export const BANK_ACCOUNTS: BankAccount[] = [
  {
    bankName: "Bank of Maldives (USD)",
    mvrAccount: null,
    usdAccount: "7730000528706",
    accountName: "MOHAED I WAHEED",
  },
  {
    bankName: "Bank of Maldives (MVR)",
    mvrAccount: "7770000168454",
    usdAccount: null,
    accountName: "W COLLECTION",
  },
  {
    bankName: "Maldives Islamic Bank (MVR)",
    mvrAccount: "90501400043381000",
    usdAccount: null,
    accountName: "W COLLECTION",
  },
];

// Gallery photos schema
export const galleryPhotos = pgTable("gallery_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  imageUrl: text("image_url").notNull(),
  altText: text("alt_text").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
});

export const insertGalleryPhotoSchema = createInsertSchema(galleryPhotos).omit({
  id: true,
});

export type InsertGalleryPhoto = z.infer<typeof insertGalleryPhotoSchema>;
export type GalleryPhoto = typeof galleryPhotos.$inferSelect;

// Constants
export const DAILY_RATE_MVR = 600;
export const USD_EXCHANGE_RATE = 20; // 600 MVR = $30 USD

// Default gallery images (used when database is empty)
export const DEFAULT_GALLERY_IMAGES = [
  { imageUrl: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80", altText: "Beachfront view" },
  { imageUrl: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80", altText: "Luxury room interior" },
  { imageUrl: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80", altText: "Ocean view room" },
  { imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80", altText: "Resort pool area" },
  { imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80", altText: "Tropical paradise" },
];
