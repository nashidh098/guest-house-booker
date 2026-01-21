console.log("📨 TELEGRAM DEBUG START");
console.log("Token exists:", !!process.env.TELEGRAM_BOT_TOKEN);
console.log("Chat IDs:", process.env.TELEGRAM_CHAT_IDS);
console.log("📨 TELEGRAM DEBUG END");
// Telegram notification service for booking alerts
import { storage } from "./storage";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ADDITIONAL_CHAT_IDS = ["5380653319"];

interface BookingNotification {
  id?: string;
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
await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chat_id: chatId,
    text: "✅ Test message from Railway",
  }),
});

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
      const requestBody: any = {
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      };

      if (booking.id) {
        requestBody.reply_markup = {
          inline_keyboard: [
            [
              { text: "✅ Approve Booking", callback_data: `approve_${booking.id}` },
              { text: "❌ Reject Booking", callback_data: `reject_${booking.id}` }
            ]
          ]
        };
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`Telegram API error for chat ${chatId}:`, error);
      }
    }

    if (booking.idPhoto && appUrl) {
      const idPhotoUrl = `${appUrl}/uploads/${booking.idPhoto}`;
      await sendPhoto(idPhotoUrl, `ID Card/Passport for ${booking.fullName}`);
    }

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

export async function sendMessageToChat(chatId: string, message: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) return false;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to send message:", error);
    return false;
  }
}

async function answerCallbackQuery(callbackQueryId: string, text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) return false;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text,
        show_alert: true,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to answer callback query:", error);
    return false;
  }
}

async function editMessageReplyMarkup(chatId: string, messageId: number, newText?: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) return false;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: [] },
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to edit message:", error);
    return false;
  }
}

export async function handleTelegramWebhook(update: any): Promise<void> {
  if (update.callback_query) {
    const callbackQuery = update.callback_query;
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id.toString();
    const messageId = callbackQuery.message.message_id;

    if (data.startsWith("approve_")) {
      const bookingId = data.replace("approve_", "");
      
      try {
        const booking = await storage.getBooking(bookingId);
        if (booking) {
          await storage.updateBookingStatus(bookingId, "Confirmed");
          await answerCallbackQuery(callbackQuery.id, `✅ Booking for ${booking.fullName} has been approved!`);
          await editMessageReplyMarkup(chatId, messageId);
          
          const confirmMessage = `✅ *BOOKING APPROVED*\n\nGuest: ${booking.fullName}\nRooms: ${booking.roomNumbers || booking.roomNumber}\nCheck-in: ${booking.checkInDate}\nCheck-out: ${booking.checkOutDate}\n\nApproved via Telegram`;
          await sendMessageToChat(chatId, confirmMessage);
        } else {
          await answerCallbackQuery(callbackQuery.id, "❌ Booking not found");
        }
      } catch (error) {
        console.error("Error approving booking:", error);
        await answerCallbackQuery(callbackQuery.id, "❌ Error approving booking");
      }
    } else if (data.startsWith("reject_")) {
      const bookingId = data.replace("reject_", "");
      
      try {
        const booking = await storage.getBooking(bookingId);
        if (booking) {
          await answerCallbackQuery(callbackQuery.id, `❌ Booking for ${booking.fullName} has been rejected`);
          await editMessageReplyMarkup(chatId, messageId);
          
          const rejectMessage = `❌ *BOOKING REJECTED*\n\nGuest: ${booking.fullName}\nRooms: ${booking.roomNumbers || booking.roomNumber}\n\nRejected via Telegram`;
          await sendMessageToChat(chatId, rejectMessage);
        } else {
          await answerCallbackQuery(callbackQuery.id, "❌ Booking not found");
        }
      } catch (error) {
        console.error("Error rejecting booking:", error);
        await answerCallbackQuery(callbackQuery.id, "❌ Error processing request");
      }
    }
    
    return;
  }

  if (!update.message?.text) return;

  const chatId = update.message.chat.id.toString();
  const text = update.message.text.toLowerCase().trim();

  if (text === "/forgotpassword" || text === "/forgot_password") {
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminUsername && adminPassword) {
      const message = `
🔐 *Admin Credentials*

Username: \`${adminUsername}\`
Password: \`${adminPassword}\`

Please keep these credentials safe!
      `.trim();

      await sendMessageToChat(chatId, message);
    } else {
      await sendMessageToChat(chatId, "Admin credentials are not configured.");
    }
  }
}
