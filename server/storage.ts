import { users, bookings, type User, type InsertUser, type Booking, type InsertBooking } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, lt, gt, sql } from "drizzle-orm";
import { format } from "date-fns";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Booking operations
  getAllBookings(): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: string, status: string): Promise<Booking | undefined>;
  checkRoomAvailability(roomNumber: number, checkIn: string, checkOut: string): Promise<boolean>;
}

// DatabaseStorage implementation using PostgreSQL
export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Booking operations
  async getAllBookings(): Promise<Booking[]> {
    const allBookings = await db
      .select()
      .from(bookings)
      .orderBy(sql`${bookings.bookingDate} DESC`);
    return allBookings;
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const bookingData = {
      ...insertBooking,
      status: insertBooking.status || "Pending",
      bookingDate: insertBooking.bookingDate || format(new Date(), "yyyy-MM-dd"),
    };

    const [booking] = await db
      .insert(bookings)
      .values(bookingData)
      .returning();
    
    // Log notification for admin
    console.log(`[NEW BOOKING NOTIFICATION] Booking received from ${booking.fullName} for Room ${booking.roomNumber}`);
    console.log(`  Check-in: ${booking.checkInDate}, Check-out: ${booking.checkOutDate}`);
    console.log(`  Total: ${booking.totalMVR} MVR ($${booking.totalUSD})`);
    
    return booking;
  }

  async updateBookingStatus(id: string, status: string): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ status })
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async checkRoomAvailability(roomNumber: number, checkIn: string, checkOut: string): Promise<boolean> {
    // Check for conflicts: newCheckin < existingCheckout AND newCheckout > existingCheckin
    const conflictingBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.roomNumber, roomNumber),
          lt(bookings.checkInDate, checkOut),
          gt(bookings.checkOutDate, checkIn)
        )
      );
    
    return conflictingBookings.length === 0;
  }
}

export const storage = new DatabaseStorage();
