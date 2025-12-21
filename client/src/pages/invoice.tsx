import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { format, parseISO } from "date-fns";
import { Download, Share2, ArrowLeft, Printer, CheckCircle, Clock } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { DAILY_RATE_MVR, type Booking } from "@shared/schema";

export default function Invoice() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const invoiceRef = useRef<HTMLDivElement>(null);

  const { data: booking, isLoading, error } = useQuery<Booking>({
    queryKey: ["/api/bookings", id],
  });

  const downloadPDF = async () => {
    if (!invoiceRef.current) return;

    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`invoice-${booking?.id || "booking"}.pdf`);

      toast({
        title: "Downloaded!",
        description: "Invoice PDF has been downloaded",
      });
    } catch (err) {
      toast({
        title: "Download Failed",
        description: "Unable to generate PDF",
        variant: "destructive",
      });
    }
  };

  const shareInvoice = async () => {
    if (!booking) return;

    const shareData = {
      title: "W Collection - Booking Invoice",
      text: `Booking confirmation for ${booking.fullName} at W Collection Guest House. Room ${booking.roomNumber}, ${booking.checkInDate} to ${booking.checkOutDate}. Total: ${booking.totalMVR} MVR ($${booking.totalUSD})`,
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
          <div ref={invoiceRef} className="bg-white p-6 md:p-8">
            {/* Invoice Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8 pb-6 border-b">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-primary mb-1" data-testid="text-brand">
                  W Collection
                </h1>
                <p className="text-muted-foreground">Guest House</p>
                <p className="text-sm text-muted-foreground">Maldives</p>
              </div>
              <div className="text-left md:text-right">
                <h2 className="text-xl font-semibold mb-2">INVOICE</h2>
                <p className="text-sm text-muted-foreground">
                  Invoice #: <span className="font-mono" data-testid="text-invoice-id">{booking.id.slice(0, 8).toUpperCase()}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Date: <span data-testid="text-booking-date">{formatDate(booking.bookingDate)}</span>
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="mb-6">
              <Badge 
                variant={booking.status === "Confirmed" ? "default" : "secondary"}
                className="text-sm"
                data-testid="badge-status"
              >
                {booking.status === "Confirmed" ? (
                  <CheckCircle className="mr-1 h-3 w-3" />
                ) : (
                  <Clock className="mr-1 h-3 w-3" />
                )}
                {booking.status}
              </Badge>
            </div>

            {/* Guest Details */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Guest Details</h3>
              <p className="font-medium text-lg" data-testid="text-guest-name">{booking.fullName}</p>
              <p className="text-muted-foreground" data-testid="text-guest-id">ID/Passport: {booking.idNumber}</p>
            </div>

            {/* Booking Details Table */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Booking Details</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Description</th>
                      <th className="text-right p-3 text-sm font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-3 text-sm">Room Number</td>
                      <td className="p-3 text-sm text-right font-medium" data-testid="text-room-number">Room {booking.roomNumber}</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-sm">Check-in Date</td>
                      <td className="p-3 text-sm text-right" data-testid="text-check-in">{formatDate(booking.checkInDate)}</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-sm">Check-out Date</td>
                      <td className="p-3 text-sm text-right" data-testid="text-check-out">{formatDate(booking.checkOutDate)}</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-sm">Total Nights</td>
                      <td className="p-3 text-sm text-right" data-testid="text-total-nights">{booking.totalNights} Night{booking.totalNights > 1 ? 's' : ''}</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-sm">Price per Night</td>
                      <td className="p-3 text-sm text-right">{DAILY_RATE_MVR} MVR</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground">Total (MVR)</span>
                <span className="text-2xl font-bold" data-testid="text-invoice-total-mvr">{booking.totalMVR.toLocaleString()} MVR</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total (USD)</span>
                <span className="text-xl font-semibold text-muted-foreground" data-testid="text-invoice-total-usd">${booking.totalUSD}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-6 border-t">
              <p className="text-muted-foreground text-sm mb-1">Thank you for choosing W Collection!</p>
              <p className="text-xs text-muted-foreground">We look forward to hosting you.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
