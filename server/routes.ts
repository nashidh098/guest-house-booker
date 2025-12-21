import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertBookingSchema } from "@shared/schema";
import { z } from "zod";
import { sendBookingNotification } from "./telegram";

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only images (jpeg, jpg, png) and PDF files are allowed"));
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Serve uploaded files
  app.use("/uploads", (req, res, next) => {
    const filePath = path.join(uploadsDir, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "File not found" });
    }
  });

  // Get all bookings
  app.get("/api/bookings", async (req, res) => {
    try {
      const bookings = await storage.getAllBookings();
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Check room availability - MUST be before :id route
  app.get("/api/bookings/check-availability", async (req, res) => {
    try {
      const { roomNumber, checkIn, checkOut } = req.query;
      
      if (!roomNumber || !checkIn || !checkOut) {
        return res.status(400).json({ message: "Missing required parameters" });
      }

      const available = await storage.checkRoomAvailability(
        parseInt(roomNumber as string, 10),
        checkIn as string,
        checkOut as string
      );

      res.json({ available });
    } catch (error) {
      console.error("Error checking availability:", error);
      res.status(500).json({ message: "Failed to check availability" });
    }
  });

  // Confirm booking - MUST be before :id route
  app.patch("/api/bookings/:id/confirm", async (req, res) => {
    try {
      const booking = await storage.updateBookingStatus(req.params.id, "Confirmed");
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      console.error("Error confirming booking:", error);
      res.status(500).json({ message: "Failed to confirm booking" });
    }
  });

  // Reject booking - MUST be before :id route
  app.patch("/api/bookings/:id/reject", async (req, res) => {
    try {
      const booking = await storage.updateBookingStatus(req.params.id, "Rejected");
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      console.error("Error rejecting booking:", error);
      res.status(500).json({ message: "Failed to reject booking" });
    }
  });

  // Cancel booking - MUST be before :id route
  app.patch("/api/bookings/:id/cancel", async (req, res) => {
    try {
      const booking = await storage.updateBookingStatus(req.params.id, "Cancelled");
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });

  // Update booking dates - MUST be before :id route
  app.patch("/api/bookings/:id/dates", async (req, res) => {
    try {
      const { checkInDate, checkOutDate, totalNights, totalMVR, totalUSD } = req.body;
      
      if (!checkInDate || !checkOutDate || !totalNights || !totalMVR || !totalUSD) {
        return res.status(400).json({ message: "Missing required date fields" });
      }

      // Get current booking to check room number
      const existingBooking = await storage.getBooking(req.params.id);
      if (!existingBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Check availability for new dates (exclude current booking)
      const available = await storage.checkRoomAvailability(
        existingBooking.roomNumber,
        checkInDate,
        checkOutDate,
        req.params.id
      );

      if (!available) {
        return res.status(409).json({ message: "Room not available for selected dates" });
      }

      const booking = await storage.updateBookingDates(
        req.params.id, 
        checkInDate, 
        checkOutDate, 
        parseInt(totalNights, 10),
        parseInt(totalMVR, 10),
        totalUSD
      );
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      console.error("Error updating booking dates:", error);
      res.status(500).json({ message: "Failed to update booking dates" });
    }
  });

  // Delete booking - MUST be before :id route
  app.delete("/api/bookings/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteBooking(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json({ message: "Booking deleted successfully" });
    } catch (error) {
      console.error("Error deleting booking:", error);
      res.status(500).json({ message: "Failed to delete booking" });
    }
  });

  // Get single booking - after specific routes
  app.get("/api/bookings/:id", async (req, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      console.error("Error fetching booking:", error);
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  // Create booking with validation
  app.post("/api/bookings", upload.single("paymentSlip"), async (req, res) => {
    try {
      const { fullName, idNumber, roomNumber, checkInDate, checkOutDate, totalNights, totalMVR, totalUSD } = req.body;
      
      // Build booking data
      const bookingData = {
        fullName,
        idNumber,
        roomNumber: parseInt(roomNumber, 10),
        checkInDate,
        checkOutDate,
        totalNights: parseInt(totalNights, 10),
        totalMVR: parseInt(totalMVR, 10),
        totalUSD,
        paymentSlip: req.file?.filename || null,
        status: "Pending",
        bookingDate: new Date().toISOString().split("T")[0],
      };

      // Validate input using Zod schema
      const validationSchema = z.object({
        fullName: z.string().min(2, "Full name is required"),
        idNumber: z.string().min(3, "ID/Passport number is required"),
        roomNumber: z.number().min(1).max(10),
        checkInDate: z.string().min(1, "Check-in date is required"),
        checkOutDate: z.string().min(1, "Check-out date is required"),
        totalNights: z.number().min(1, "Must stay at least 1 night"),
        totalMVR: z.number().min(1),
        totalUSD: z.string(),
        paymentSlip: z.string().nullable(),
        status: z.string(),
        bookingDate: z.string(),
      });

      const parseResult = validationSchema.safeParse(bookingData);
      
      if (!parseResult.success) {
        // Delete uploaded file if validation fails
        if (req.file) {
          fs.unlinkSync(path.join(uploadsDir, req.file.filename));
        }
        const errors = parseResult.error.errors.map(e => e.message).join(", ");
        return res.status(400).json({ message: `Validation failed: ${errors}` });
      }

      // Check room availability before booking
      const available = await storage.checkRoomAvailability(
        bookingData.roomNumber,
        bookingData.checkInDate,
        bookingData.checkOutDate
      );

      if (!available) {
        // Delete uploaded file if booking fails
        if (req.file) {
          fs.unlinkSync(path.join(uploadsDir, req.file.filename));
        }
        return res.status(409).json({ message: "Room already booked for selected dates" });
      }

      const booking = await storage.createBooking(parseResult.data);
      
      // Send Telegram notification (don't await - let it run in background)
      const appUrl = `${req.protocol}://${req.get("host")}`;
      sendBookingNotification({
        fullName: booking.fullName,
        idNumber: booking.idNumber,
        roomNumber: booking.roomNumber,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        totalNights: booking.totalNights,
        totalMVR: booking.totalMVR,
        totalUSD: booking.totalUSD,
        paymentSlip: booking.paymentSlip,
      }, appUrl).catch(err => console.error("Telegram notification failed:", err));
      
      res.status(201).json(booking);
    } catch (error) {
      console.error("Booking error:", error);
      // Clean up uploaded file on error
      if (req.file) {
        try {
          fs.unlinkSync(path.join(uploadsDir, req.file.filename));
        } catch {}
      }
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  return httpServer;
}
