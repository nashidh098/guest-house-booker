import { users, bookings, galleryPhotos, type User, type InsertUser, type Booking, type InsertBooking, type GalleryPhoto, type InsertGalleryPhoto } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, lt, gt, sql, asc } from "drizzle-orm";
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
  updateBookingDates(id: string, checkIn: string, checkOut: string, totalNights: number, totalMVR: number, totalUSD: string): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<boolean>;
  checkRoomAvailability(roomNumber: number, checkIn: string, checkOut: string, excludeBookingId?: string): Promise<boolean>;
  
  // Gallery operations
  getAllGalleryPhotos(): Promise<GalleryPhoto[]>;
  addGalleryPhoto(photo: InsertGalleryPhoto): Promise<GalleryPhoto>;
  deleteGalleryPhoto(id: string): Promise<boolean>;
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

  async updateBookingStatus(id: string, status: string, adminNotes?: string): Promise<Booking | undefined> {
    const updateData: { status: string; adminNotes?: string } = { status };
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }
    const [booking] = await db
      .update(bookings)
      .set(updateData)
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async updateBookingDates(id: string, checkIn: string, checkOut: string, totalNights: number, totalMVR: number, totalUSD: string): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ 
        checkInDate: checkIn, 
        checkOutDate: checkOut,
        totalNights,
        totalMVR,
        totalUSD
      })
      .where(eq(bookings.id, id))
      .returning();
    return booking || undefined;
  }

  async deleteBooking(id: string): Promise<boolean> {
    const result = await db
      .delete(bookings)
      .where(eq(bookings.id, id))
      .returning();
    return result.length > 0;
  }

  async checkRoomAvailability(roomNumber: number, checkIn: string, checkOut: string, excludeBookingId?: string): Promise<boolean> {
    // Check for conflicts: newCheckin < existingCheckout AND newCheckout > existingCheckin
    // Only check active bookings (not Cancelled or Rejected)
    const conflictingBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.roomNumber, roomNumber),
          lt(bookings.checkInDate, checkOut),
          gt(bookings.checkOutDate, checkIn),
          sql`${bookings.status} NOT IN ('Cancelled', 'Rejected')`,
          excludeBookingId ? sql`${bookings.id} != ${excludeBookingId}` : sql`1=1`
        )
      );
    
    return conflictingBookings.length === 0;
  }

  // Gallery operations
  async getAllGalleryPhotos(): Promise<GalleryPhoto[]> {
    const photos = await db
      .select()
      .from(galleryPhotos)
      .orderBy(asc(galleryPhotos.displayOrder));
    return photos;
  }

  async addGalleryPhoto(photo: InsertGalleryPhoto): Promise<GalleryPhoto> {
    const [newPhoto] = await db
      .insert(galleryPhotos)
      .values(photo)
      .returning();
    return newPhoto;
  }

  async deleteGalleryPhoto(id: string): Promise<boolean> {
    const result = await db
      .delete(galleryPhotos)
      .where(eq(galleryPhotos.id, id))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
