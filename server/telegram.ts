// Telegram notification service for booking alerts

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

interface BookingNotification {
  fullName: string;
  idNumber: string;
  phoneNumber: string | null;
  customerNotes: string | null;
  roomNumber: number;
  checkInDate: string;
  checkOutDate: string;
  totalNights: number;
  totalMVR: number;
  totalUSD: string;
  paymentSlip: string | null;
}

export async function sendBookingNotification(booking: BookingNotification, appUrl?: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log("Telegram credentials not configured, skipping notification");
    return false;
  }

  try {
    const message = `
🏨 *NEW BOOKING RECEIVED*

👤 *Guest Details*
Name: ${booking.fullName}
ID/Passport: ${booking.idNumber}
Phone: ${booking.phoneNumber || "Not provided"}

🛏️ *Room Information*
Room Number: ${booking.roomNumber}
Check-in: ${booking.checkInDate}
Check-out: ${booking.checkOutDate}
Nights: ${booking.totalNights}

💰 *Payment*
Total: ${booking.totalMVR.toLocaleString()} MVR
(USD ${booking.totalUSD})
Payment Slip: ${booking.paymentSlip ? "Uploaded" : "Not uploaded"}

${booking.customerNotes ? `📝 *Customer Notes*\n${booking.customerNotes}\n` : ""}📅 Booked on: ${new Date().toLocaleDateString()}
    `.trim();

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Telegram API error:", error);
      return false;
    }

    // If there's a payment slip, send it as a photo
    if (booking.paymentSlip && appUrl) {
      const photoUrl = `${appUrl}/uploads/${booking.paymentSlip}`;
      await sendPhoto(photoUrl, `Payment slip for ${booking.fullName}`);
    }

    console.log("Telegram notification sent successfully");
    return true;
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
    return false;
  }
}

async function sendPhoto(photoUrl: string, caption: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        photo: photoUrl,
        caption: caption,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to send photo to Telegram:", error);
    return false;
  }
}
