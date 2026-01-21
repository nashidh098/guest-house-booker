CREATE TABLE "bookings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"id_number" text NOT NULL,
	"phone_number" text,
	"customer_notes" text,
	"room_number" integer NOT NULL,
	"room_numbers" text,
	"extra_bed" boolean DEFAULT false,
	"extra_beds" text,
	"check_in_date" text NOT NULL,
	"check_out_date" text NOT NULL,
	"total_nights" integer NOT NULL,
	"total_mvr" integer NOT NULL,
	"total_usd" text NOT NULL,
	"payment_slip" text,
	"id_photo" text,
	"status" text DEFAULT 'Pending' NOT NULL,
	"admin_notes" text,
	"booking_date" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery_photos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image_url" text NOT NULL,
	"alt_text" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
