import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertBookingSchema } from "@shared/schema";
import { z } from "zod";

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
