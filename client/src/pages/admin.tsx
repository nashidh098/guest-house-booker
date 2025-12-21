import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { 
  CalendarCheck, 
  Clock, 
  CheckCircle, 
  Users, 
  Eye, 
  Check, 
  X, 
  Search,
  Bell,
  Calendar,
  Loader2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Booking } from "@shared/schema";

interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  todayCheckIns: number;
}

export default function Admin() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [newBookingsCount, setNewBookingsCount] = useState(0);

  // Fetch all bookings
  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    refetchInterval: 5000, // Poll every 5 seconds for new bookings
  });

  // Calculate stats
  const stats: BookingStats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === "Pending").length,
    confirmed: bookings.filter(b => b.status === "Confirmed").length,
    todayCheckIns: bookings.filter(b => {
      const today = format(new Date(), "yyyy-MM-dd");
      return b.checkInDate === today;
    }).length,
  };

  // Confirm booking mutation
  const confirmMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest("PATCH", `/api/bookings/${bookingId}/confirm`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Confirmed",
        description: "The booking status has been updated to Confirmed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to confirm booking",
        variant: "destructive",
      });
    },
  });

  // Track new bookings
  useEffect(() => {
    const previousCount = localStorage.getItem("lastBookingCount");
    if (previousCount !== null) {
      const prevNum = parseInt(previousCount, 10);
      if (bookings.length > prevNum) {
        const newCount = bookings.length - prevNum;
        setNewBookingsCount(newCount);
        toast({
          title: "New Booking!",
          description: `${newCount} new booking${newCount > 1 ? 's' : ''} received`,
        });
        console.log(`[ADMIN NOTIFICATION] ${newCount} new booking(s) received!`);
      }
    }
    localStorage.setItem("lastBookingCount", bookings.length.toString());
  }, [bookings.length, toast]);

  const clearNotifications = () => {
    setNewBookingsCount(0);
  };

  // Filter bookings by search term
  const filteredBookings = bookings.filter(booking =>
    booking.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.idNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "MMM dd, yyyy");
    } catch {
      return dateStr;
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) => (
    <Card className="hover-elevate">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-admin-title">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">W Collection Guest House</p>
          </div>
          <div className="flex items-center gap-2">
            {newBookingsCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearNotifications}
                className="relative"
                data-testid="button-notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                  {newBookingsCount}
                </span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Bookings"
            value={stats.total}
            icon={Users}
            color="bg-primary/10 text-primary"
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            icon={Clock}
            color="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
          />
          <StatCard
            title="Confirmed"
            value={stats.confirmed}
            icon={CheckCircle}
            color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          />
          <StatCard
            title="Today's Check-ins"
            value={stats.todayCheckIns}
            icon={CalendarCheck}
            color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          />
        </div>

        {/* Bookings Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <CardTitle>All Bookings</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or ID..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-1">No bookings found</p>
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? "Try a different search term" : "Bookings will appear here when guests make reservations"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guest</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => (
                      <TableRow key={booking.id} data-testid={`row-booking-${booking.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{booking.fullName}</p>
                            <p className="text-sm text-muted-foreground">{booking.idNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell>Room {booking.roomNumber}</TableCell>
                        <TableCell>{formatDate(booking.checkInDate)}</TableCell>
                        <TableCell>{formatDate(booking.checkOutDate)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{booking.totalMVR.toLocaleString()} MVR</p>
                            <p className="text-sm text-muted-foreground">${booking.totalUSD}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={booking.status === "Confirmed" ? "default" : "secondary"}
                            data-testid={`badge-status-${booking.id}`}
                          >
                            {booking.status === "Confirmed" ? (
                              <CheckCircle className="mr-1 h-3 w-3" />
                            ) : (
                              <Clock className="mr-1 h-3 w-3" />
                            )}
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {booking.paymentSlip && (
                              <Dialog open={showSlipModal && selectedBooking?.id === booking.id} onOpenChange={(open) => {
                                setShowSlipModal(open);
                                if (!open) setSelectedBooking(null);
                              }}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedBooking(booking);
                                      setShowSlipModal(true);
                                    }}
                                    data-testid={`button-view-slip-${booking.id}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Payment Slip</DialogTitle>
                                    <DialogDescription>
                                      Uploaded by {booking.fullName}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="mt-4">
                                    <img
                                      src={`/uploads/${booking.paymentSlip}`}
                                      alt="Payment slip"
                                      className="w-full max-h-[60vh] object-contain rounded-lg"
                                      data-testid="img-payment-slip"
                                    />
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                            {booking.status === "Pending" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => confirmMutation.mutate(booking.id)}
                                disabled={confirmMutation.isPending}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                data-testid={`button-confirm-${booking.id}`}
                              >
                                {confirmMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
