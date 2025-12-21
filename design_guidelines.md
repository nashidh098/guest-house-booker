# Design Guidelines: W Collection Guest House Booking System

## Design Approach: Clean Hospitality System

**Selected Approach:** Modern hospitality design inspired by Booking.com and Airbnb's professional booking interfaces, combined with Material Design principles for forms and data displays.

**Design Philosophy:** Professional, trustworthy, and efficient booking experience with emphasis on clarity, ease of use, and mobile responsiveness.

---

## Typography

**Font Families:**
- Primary: 'Inter' or 'Plus Jakarta Sans' (Google Fonts) - Clean, modern sans-serif
- Headings: Font weight 600-700
- Body text: Font weight 400
- Labels/metadata: Font weight 500

**Hierarchy:**
- Page titles: text-3xl md:text-4xl (36-48px)
- Section headers: text-2xl (30px)
- Card titles: text-xl (24px)
- Form labels: text-sm font-medium (14px)
- Body text: text-base (16px)
- Helper text: text-sm text-gray-600 (14px)

---

## Layout System

**Spacing Units:** Tailwind units 4, 6, 8, 12, 16, 20, 24
- Component padding: p-6 to p-8
- Section spacing: py-12 to py-20
- Card gaps: gap-6
- Form field spacing: space-y-6

**Container Widths:**
- Public booking form: max-w-4xl centered
- Admin dashboard: max-w-7xl
- Invoice: max-w-2xl

**Grid System:**
- Desktop booking form: 2-column layout for date pickers, single column for other fields
- Admin dashboard: Full-width table/card grid
- Mobile: Always single column (stacked)

---

## Component Library

### Navigation & Header
- Top navigation bar with logo "W Collection" on left
- Mobile: Hamburger menu, collapsible
- Header includes: Home, Book Now, Contact links
- Sticky header on scroll

### Booking Form Components
**Form Container:**
- Elevated card with shadow-lg
- Rounded corners: rounded-xl
- White background with subtle border

**Input Fields:**
- Height: h-12
- Rounded: rounded-lg
- Border: 2px solid with focus ring
- Icons: Left-aligned icons for ID, room selection, dates
- Date pickers: Calendar icon, clear selection button

**Room Selection Dropdown:**
- Shows room number and availability status
- Disabled rooms shown with strike-through text
- Real-time availability indicator

**Calculation Display:**
- Prominent pricing card with border-l-4 accent
- Large text for total amounts: text-2xl font-bold
- Currency clearly labeled (MVR | USD)
- Breakdown: nights × rate per night

**Bank Details Section:**
- Accordion-style expandable sections for each bank
- Copy button: Icon button with clipboard icon
- Success toast: "Account number copied!" with checkmark
- Account details in monospace font for clarity

**Payment Upload:**
- Drag-and-drop zone with dashed border
- File preview thumbnail after upload
- File size limit indicator: "Max 5MB"
- Accept: images only (.jpg, .png, .pdf)

**Submit Button:**
- Full width on mobile, max-w-md on desktop
- Height: h-14
- Disabled state when room unavailable (with reason tooltip)
- Loading spinner during submission

### Invoice Page
**Layout:**
- Clean, print-optimized design
- Header with "W Collection" branding
- Invoice number and date prominent
- Table format for booking details
- Summary section with totals highlighted
- Footer with thank you message

**Action Buttons:**
- Download PDF: Primary button
- Share: Secondary button with share icon
- Print: Tertiary/outline button

### Admin Dashboard
**Statistics Cards:**
- 4-column grid on desktop (2 on tablet, 1 on mobile)
- Cards show: Total bookings, Pending, Confirmed, Today's check-ins
- Icon + number + label format
- Hover effect: subtle lift with shadow

**Bookings Table:**
- Sortable columns: Date, Guest, Room, Status, Amount
- Status badges: Pill shape with status-specific styling
- Row actions: View details, View payment slip, Confirm booking
- Pagination at bottom
- Search/filter bar above table

**Payment Slip Modal:**
- Full-screen overlay on mobile
- Centered modal on desktop
- Image zoom capability
- Approve/Reject actions

### Notifications
- Toast notifications: Top-right corner
- Auto-dismiss after 5 seconds
- Types: Success (green), Error (red), Info (blue)
- Admin notification badge: Red dot with count

---

## Images

**Hero Section (Home Page):**
- Large hero image: Inviting guest house exterior or beautifully styled room interior
- Overlay with gradient (dark to transparent)
- Centered heading: "Welcome to W Collection Guest House"
- Subheading: "Experience comfort in the heart of Maldives"
- CTA button with blurred background: "Book Your Stay"

**Room Images (Optional for enhanced version):**
- Thumbnail images for each room in dropdown
- Gallery on separate room details page if expanded

**Placement:**
- Hero: 60vh on desktop, 50vh on mobile
- Invoice header: Small logo/watermark

---

## Responsive Design

**Breakpoints:**
- Mobile: < 768px (base styles)
- Tablet: 768px - 1024px (md:)
- Desktop: > 1024px (lg:)

**Mobile Optimizations:**
- Larger tap targets (min 44px)
- Simplified navigation (hamburger menu)
- Single-column forms
- Sticky submit button at bottom
- Collapsible sections for bank details

---

## Accessibility

- ARIA labels on all form inputs
- Keyboard navigation support
- Focus indicators on all interactive elements (ring-2)
- Error messages linked to inputs
- Color contrast minimum 4.5:1
- Screen reader announcements for booking confirmations

---

## Animation & Interaction

**Subtle Transitions:**
- Form field focus: 200ms ease
- Button hover: scale-105, 150ms
- Card hover: shadow expansion, 300ms
- Toast slide-in: 300ms from right

**NO heavy animations** - keep interactions smooth and professional.