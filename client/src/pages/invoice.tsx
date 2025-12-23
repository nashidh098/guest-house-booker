import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { format, parseISO } from "date-fns";
import { Download, Share2, ArrowLeft, Printer } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { DAILY_RATE_MVR, EXTRA_BED_CHARGE_MVR, type Booking } from "@shared/schema";

export default function Invoice() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const invoiceRef = useRef<HTMLDivElement>(null);

  const { data: booking, isLoading, error } = useQuery<Booking>({
    queryKey: ["/api/bookings", id],
  });

  const parseRoomNumbers = (roomNumbers: string | null | undefined): number[] | null => {
    if (!roomNumbers) return null;
    try {
      const parsed = JSON.parse(roomNumbers);
      if (Array.isArray(parsed) && parsed.every(r => typeof r === 'number')) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  };

  const parseExtraBeds = (extraBeds: string | null | undefined): number[] | null => {
    if (!extraBeds) return null;
    try {
      const parsed = JSON.parse(extraBeds);
      if (Array.isArray(parsed) && parsed.every(r => typeof r === 'number')) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  };

  const downloadPDF = async () => {
    if (!invoiceRef.current) return;

    try {
      const element = invoiceRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      
      pdf.setProperties({
        title: `MOONLIGHT INN Invoice - ${booking?.id?.slice(0, 8) || "booking"}`,
        subject: "Booking Invoice",
        author: "MOONLIGHT INN",
        creator: "MOONLIGHT INN",
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);
      const contentHeight = pageHeight - (margin * 2);
      
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const finalHeight = Math.min(imgHeight, contentHeight);
      const finalWidth = (finalHeight === contentHeight) 
        ? (canvas.width * contentHeight) / canvas.height 
        : imgWidth;

      const xOffset = (pageWidth - finalWidth) / 2;
      const yOffset = margin;

      pdf.addImage(imgData, "PNG", xOffset, yOffset, finalWidth, finalHeight);
      
      const pdfBlob = pdf.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `MOONLIGHT-INN-Invoice-${booking?.id?.slice(0, 8) || "booking"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      toast({
        title: "Downloaded!",
        description: "Invoice PDF has been downloaded",
      });
    } catch (err) {
      console.error("PDF download error:", err);
      toast({
        title: "Download Failed",
        description: "Unable to generate PDF. Try using Print instead.",
        variant: "destructive",
      });
    }
  };

  const shareInvoice = async () => {
    if (!booking) return;

    const parsedRooms = parseRoomNumbers(booking.roomNumbers);
    const roomsText = parsedRooms 
      ? `Rooms ${parsedRooms.join(', ')}`
      : `Room ${booking.roomNumber}`;
    
    const shareData = {
      title: "MOONLIGHT INN - Booking Invoice",
      text: `Booking confirmation for ${booking.fullName} at MOONLIGHT INN. ${roomsText}, ${booking.checkInDate} to ${booking.checkOutDate}. Total: ${booking.totalMVR} MVR ($${booking.totalUSD})`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied!",
          description: "Invoice link copied to clipboard",
        });
      }
    } catch (err) {
      toast({
        title: "Share Failed",
        description: "Unable to share invoice",
        variant: "destructive",
      });
    }
  };

  const printInvoice = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-8 w-48 mb-8" />
          <Skeleton className="h-[600px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <h2 className="text-2xl font-bold mb-4">Invoice Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The booking invoice you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/">
            <Button data-testid="button-back-home">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "MMM dd, yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 print:hidden">
          <Link href="/">
            <Button variant="ghost" data-testid="button-back">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Booking
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" onClick={printInvoice} data-testid="button-print">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" onClick={shareInvoice} data-testid="button-share">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button onClick={downloadPDF} data-testid="button-download-pdf">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Invoice Card */}
        <Card className="shadow-lg overflow-hidden">
          <div ref={invoiceRef} className="bg-white p-5">
            {/* Invoice Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-4 pb-3 border-b">
              <div>
                <h1 className="text-xl font-bold text-primary" data-testid="text-brand">
                  MOONLIGHT INN
                </h1>
                <p className="text-sm text-muted-foreground">Guest House, Maldives</p>
              </div>
              <div className="text-left md:text-right">
                <h2 className="text-lg font-semibold">INVOICE</h2>
                <p className="text-xs text-muted-foreground">
                  Invoice #: <span className="font-mono" data-testid="text-invoice-id">{booking.id.slice(0, 8).toUpperCase()}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Date: <span data-testid="text-booking-date">{formatDate(booking.bookingDate)}</span>
                </p>
              </div>
            </div>

            {/* Guest Details */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Guest Details</h3>
              <p className="font-medium" data-testid="text-guest-name">{booking.fullName}</p>
              <p className="text-sm text-muted-foreground" data-testid="text-guest-id">ID/Passport: {booking.idNumber}</p>
            </div>

            {/* Booking Details Table */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Booking Details</h3>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Description</th>
                      <th className="text-right px-3 py-2 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-3 py-2">Room{parseRoomNumbers(booking.roomNumbers) ? 's' : ''}</td>
                      <td className="px-3 py-2 text-right font-medium" data-testid="text-room-number">
                        {(() => {
                          const rooms = parseRoomNumbers(booking.roomNumbers);
                          return rooms 
                            ? rooms.map(r => `Room ${r}`).join(', ')
                            : `Room ${booking.roomNumber}`;
                        })()}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Check-in Date</td>
                      <td className="px-3 py-2 text-right" data-testid="text-check-in">{formatDate(booking.checkInDate)}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Check-out Date</td>
                      <td className="px-3 py-2 text-right" data-testid="text-check-out">{formatDate(booking.checkOutDate)}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Total Nights</td>
                      <td className="px-3 py-2 text-right" data-testid="text-total-nights">{booking.totalNights} Night{booking.totalNights > 1 ? 's' : ''}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Price per Room per Night</td>
                      <td className="px-3 py-2 text-right">{DAILY_RATE_MVR} MVR</td>
                    </tr>
                    {(() => {
                      const extraBedRooms = parseExtraBeds(booking.extraBeds);
                      if (extraBedRooms && extraBedRooms.length > 0) {
                        return (
                          <tr>
                            <td className="px-3 py-2">
                              Extra Bed{extraBedRooms.length > 1 ? 's' : ''} (Room{extraBedRooms.length > 1 ? 's' : ''} {extraBedRooms.join(', ')})
                            </td>
                            <td className="px-3 py-2 text-right">{extraBedRooms.length * EXTRA_BED_CHARGE_MVR} MVR</td>
                          </tr>
                        );
                      } else if (booking.extraBed) {
                        return (
                          <tr>
                            <td className="px-3 py-2">Extra Bed</td>
                            <td className="px-3 py-2 text-right">{EXTRA_BED_CHARGE_MVR} MVR</td>
                          </tr>
                        );
                      }
                      return null;
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-muted/50 rounded-md p-3 mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-muted-foreground">Total (MVR)</span>
                <span className="text-xl font-bold" data-testid="text-invoice-total-mvr">{booking.totalMVR.toLocaleString()} MVR</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total (USD)</span>
                <span className="text-lg font-semibold text-muted-foreground" data-testid="text-invoice-total-usd">${booking.totalUSD}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-3 border-t">
              <p className="text-muted-foreground text-xs mb-1">If there are any extra charges, payment will be made at checkout. Thank you</p>
              <p className="text-muted-foreground text-xs">Thank you for choosing MOONLIGHT INN! We look forward to hosting you.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
