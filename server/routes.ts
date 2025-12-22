import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertBookingSchema, insertGalleryPhotoSchema, DEFAULT_GALLERY_IMAGES } from "@shared/schema";
import { z } from "zod";
import { sendBookingNotification } from "./telegram";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), "uploads");
const galleryUploadsDir = path.join(process.cwd(), "uploads", "gallery");

// Ensure uploads directories exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(galleryUploadsDir)) {
  fs.mkdirSync(galleryUploadsDir, { recursive: true });
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

// Gallery-specific multer configuration
const galleryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, galleryUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const galleryUpload = multer({
  storage: galleryStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for gallery images
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only images (jpeg, jpg, png, webp) are allowed"));
  },
});

const objectStorageService = new ObjectStorageService();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register object storage routes for presigned URL uploads
  registerObjectStorageRoutes(app);
  
  // Serve uploaded files (for legacy local uploads like payment slips)
  app.use("/uploads", (req, res, next) => {
    // req.path starts with /, so we need to handle it properly
    const relativePath = req.path.startsWith('/') ? req.path.slice(1) : req.path;
    const filePath = path.join(uploadsDir, relativePath);
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
      const { adminNotes } = req.body || {};
      const booking = await storage.updateBookingStatus(req.params.id, "Rejected", adminNotes);
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
        typeof totalNights === 'number' ? totalNights : parseInt(totalNights, 10),
        typeof totalMVR === 'number' ? totalMVR : parseInt(totalMVR, 10),
        String(totalUSD)
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

  // ==================== Gallery Routes ====================
  
  // Get all gallery photos
  app.get("/api/gallery", async (req, res) => {
    try {
      const photos = await storage.getAllGalleryPhotos();
      // If no photos in database, return default images
      if (photos.length === 0) {
        return res.json(DEFAULT_GALLERY_IMAGES.map((img, index) => ({
          id: `default-${index}`,
          imageUrl: img.imageUrl,
          altText: img.altText,
          displayOrder: index,
        })));
      }
      res.json(photos);
    } catch (error) {
      console.error("Error fetching gallery:", error);
      res.status(500).json({ message: "Failed to fetch gallery" });
    }
  });

  // Add gallery photo (using object storage path from presigned URL upload)
  app.post("/api/gallery", async (req, res) => {
    try {
      const { objectPath, altText, displayOrder } = req.body;
      
      if (!objectPath) {
        return res.status(400).json({ message: "Object path is required (upload file first)" });
      }

      const altTextValue = altText || "Gallery image";
      const displayOrderStr = String(displayOrder || "0").trim();
      
      // Strict numeric validation - only pure integer strings allowed
      if (!/^\d+$/.test(displayOrderStr)) {
        return res.status(400).json({ message: "Invalid display order - must be a number" });
      }
      
      const displayOrderValue = parseInt(displayOrderStr, 10);

      // Set the ACL policy to make the image public
      const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(
        objectPath,
        { owner: "admin", visibility: "public" }
      );

      // Validate with schema
      const validationResult = insertGalleryPhotoSchema.safeParse({
        imageUrl: normalizedPath,
        altText: altTextValue,
        displayOrder: displayOrderValue,
      });

      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid data", errors: validationResult.error.errors });
      }

      const photo = await storage.addGalleryPhoto(validationResult.data);
      res.status(201).json(photo);
    } catch (error) {
      console.error("Error adding gallery photo:", error);
      res.status(500).json({ message: "Failed to add photo" });
    }
  });

  // Delete gallery photo
  app.delete("/api/gallery/:id", async (req, res) => {
    try {
      // First get the photo to find the file path
      const photo = await storage.getGalleryPhotoById(req.params.id);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }

      // Delete from database
      const deleted = await storage.deleteGalleryPhoto(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Photo not found" });
      }

      // Delete file from disk if it's a legacy local upload
      if (photo.imageUrl.startsWith("/uploads/gallery/")) {
        const filename = photo.imageUrl.replace("/uploads/gallery/", "");
        const filePath = path.join(galleryUploadsDir, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      // Note: Object storage files are not deleted as they may be referenced elsewhere
      // and will be automatically cleaned up by storage policies

      res.json({ message: "Photo deleted successfully" });
    } catch (error) {
      console.error("Error deleting gallery photo:", error);
      res.status(500).json({ message: "Failed to delete photo" });
    }
  });

  // ==================== Booking Routes ====================

  // Create booking with validation
  const bookingUpload = upload.fields([
    { name: "idPhoto", maxCount: 1 },
    { name: "paymentSlip", maxCount: 1 }
  ]);
  
  app.post("/api/bookings", bookingUpload, async (req, res) => {
    try {
      const { fullName, idNumber, phoneNumber, customerNotes, roomNumber, roomNumbers, extraBed, extraBeds, checkInDate, checkOutDate, totalNights, totalMVR, totalUSD } = req.body;
      
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const idPhotoFile = files?.idPhoto?.[0];
      const paymentSlipFile = files?.paymentSlip?.[0];
      
      // Build booking data
      const bookingData = {
        fullName,
        idNumber,
        phoneNumber: phoneNumber || undefined,
        customerNotes: customerNotes || undefined,
        roomNumber: parseInt(roomNumber, 10),
        roomNumbers: roomNumbers || undefined, // JSON array string of room numbers
        extraBed: extraBed === "true" || extraBed === true,
        extraBeds: extraBeds || undefined, // JSON array string of room numbers with extra beds
        checkInDate,
        checkOutDate,
        totalNights: parseInt(totalNights, 10),
        totalMVR: parseInt(totalMVR, 10),
        totalUSD,
        idPhoto: idPhotoFile?.filename || undefined,
        paymentSlip: paymentSlipFile?.filename || undefined,
        status: "Pending",
        bookingDate: new Date().toISOString().split("T")[0],
      };

      // Validate roomNumbers is valid JSON array if provided
      let parsedRoomNumbers: number[] | null = null;
      if (roomNumbers) {
        try {
          parsedRoomNumbers = JSON.parse(roomNumbers);
          if (!Array.isArray(parsedRoomNumbers) || !parsedRoomNumbers.every(r => typeof r === 'number' && r >= 1 && r <= 10)) {
            return res.status(400).json({ message: "Invalid room numbers format" });
          }
        } catch {
          return res.status(400).json({ message: "Invalid room numbers JSON" });
        }
      }

      // Validate extraBeds is valid JSON array if provided
      if (extraBeds) {
        try {
          const parsedExtraBeds = JSON.parse(extraBeds);
          if (!Array.isArray(parsedExtraBeds) || !parsedExtraBeds.every(r => typeof r === 'number' && r >= 1 && r <= 10)) {
            return res.status(400).json({ message: "Invalid extra beds format" });
          }
          // Ensure extra beds are only for selected rooms
          if (parsedRoomNumbers && !parsedExtraBeds.every(r => parsedRoomNumbers!.includes(r))) {
            return res.status(400).json({ message: "Extra beds can only be added to selected rooms" });
          }
        } catch {
          return res.status(400).json({ message: "Invalid extra beds JSON" });
        }
      }

      // Helper to clean up uploaded files on error
      const cleanupFiles = () => {
        if (idPhotoFile) {
          try { fs.unlinkSync(path.join(uploadsDir, idPhotoFile.filename)); } catch {}
        }
        if (paymentSlipFile) {
          try { fs.unlinkSync(path.join(uploadsDir, paymentSlipFile.filename)); } catch {}
        }
      };

      // Validate input using Zod schema
      const validationSchema = z.object({
        fullName: z.string().min(2, "Full name is required"),
        idNumber: z.string().min(3, "ID/Passport number is required"),
        phoneNumber: z.string().optional(),
        customerNotes: z.string().optional(),
        roomNumber: z.number().min(1).max(10),
        roomNumbers: z.string().optional(),
        extraBed: z.boolean().optional(),
        extraBeds: z.string().optional(),
        checkInDate: z.string().min(1, "Check-in date is required"),
        checkOutDate: z.string().min(1, "Check-out date is required"),
        totalNights: z.number().min(1, "Must stay at least 1 night"),
        totalMVR: z.number().min(1),
        totalUSD: z.string(),
        idPhoto: z.string().optional(),
        paymentSlip: z.string().optional(),
        status: z.string(),
        bookingDate: z.string(),
      });

      const parseResult = validationSchema.safeParse(bookingData);
      
      if (!parseResult.success) {
        cleanupFiles();
        const errors = parseResult.error.errors.map(e => e.message).join(", ");
        return res.status(400).json({ message: `Validation failed: ${errors}` });
      }

      // Check availability for all selected rooms
      const selectedRooms: number[] = parsedRoomNumbers || [parseInt(roomNumber, 10)];
      for (const room of selectedRooms) {
        const available = await storage.checkRoomAvailability(
          room,
          bookingData.checkInDate,
          bookingData.checkOutDate
        );
        
        if (!available) {
          cleanupFiles();
          return res.status(409).json({ message: `Room ${room} already booked for selected dates` });
        }
      }

      const booking = await storage.createBooking(parseResult.data);
      
      // Send Telegram notification (don't await - let it run in background)
      const appUrl = `${req.protocol}://${req.get("host")}`;
      sendBookingNotification({
        fullName: booking.fullName,
        idNumber: booking.idNumber,
        phoneNumber: booking.phoneNumber,
        customerNotes: booking.customerNotes,
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
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  return httpServer;
}
