import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO, differenceInDays } from "date-fns";
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
  Loader2,
  Trash2,
  Ban,
  Edit,
  XCircle,
  Image,
  Plus
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Booking, type GalleryPhoto, DAILY_RATE_MVR, USD_EXCHANGE_RATE } from "@shared/schema";

interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  todayCheckIns: number;
}

export default function Admin() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [editCheckIn, setEditCheckIn] = useState("");
  const [editCheckOut, setEditCheckOut] = useState("");
  const [newBookingsCount, setNewBookingsCount] = useState(0);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newPhotoAlt, setNewPhotoAlt] = useState("");
  const [showAddPhotoDialog, setShowAddPhotoDialog] = useState(false);

  // Fetch all bookings
  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    refetchInterval: 5000,
  });

  // Fetch gallery photos
  const { data: galleryPhotos = [], isLoading: galleryLoading } = useQuery<GalleryPhoto[]>({
    queryKey: ["/api/gallery"],
  });

  // Calculate stats
  const stats: BookingStats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === "Pending").length,
    confirmed: bookings.filter(b => b.status === "Confirmed").length,
    cancelled: bookings.filter(b => b.status === "Cancelled" || b.status === "Rejected").length,
    todayCheckIns: bookings.filter(b => {
      const today = format(new Date(), "yyyy-MM-dd");
      return b.checkInDate === today && b.status !== "Cancelled" && b.status !== "Rejected";
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
        description: "The booking has been confirmed",
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

  // Reject booking mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ bookingId, adminNotes }: { bookingId: string; adminNotes: string }) => {
      return apiRequest("PATCH", `/api/bookings/${bookingId}/reject`, { adminNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setShowRejectModal(false);
      setSelectedBooking(null);
      setRejectNotes("");
      toast({
        title: "Booking Rejected",
        description: "The booking has been rejected and dates are now available",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject booking",
        variant: "destructive",
      });
    },
  });

  const openRejectModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setRejectNotes("");
    setShowRejectModal(true);
  };

  const handleReject = () => {
    if (!selectedBooking) return;
    rejectMutation.mutate({ bookingId: selectedBooking.id, adminNotes: rejectNotes });
  };

  // Cancel booking mutation
  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest("PATCH", `/api/bookings/${bookingId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Cancelled",
        description: "The booking has been cancelled and dates are now available",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive",
      });
    },
  });

  // Delete booking mutation
  const deleteMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest("DELETE", `/api/bookings/${bookingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Deleted",
        description: "The booking has been permanently deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete booking",
        variant: "destructive",
      });
    },
  });

  // Update dates mutation
  const updateDatesMutation = useMutation({
    mutationFn: async ({ bookingId, checkInDate, checkOutDate, totalNights, totalMVR, totalUSD }: {
      bookingId: string;
      checkInDate: string;
      checkOutDate: string;
      totalNights: number;
      totalMVR: number;
      totalUSD: string;
    }) => {
      return apiRequest("PATCH", `/api/bookings/${bookingId}/dates`, {
        checkInDate,
        checkOutDate,
        totalNights,
        totalMVR,
        totalUSD,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setShowEditModal(false);
      setSelectedBooking(null);
      toast({
        title: "Dates Updated",
        description: "The booking dates have been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update dates. Room may not be available.",
        variant: "destructive",
      });
    },
  });

  // Add gallery photo mutation
  const addPhotoMutation = useMutation({
    mutationFn: async ({ imageUrl, altText }: { imageUrl: string; altText: string }) => {
      return apiRequest("POST", "/api/gallery", { imageUrl, altText, displayOrder: galleryPhotos.length });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      setShowAddPhotoDialog(false);
      setNewPhotoUrl("");
      setNewPhotoAlt("");
      toast({
        title: "Photo Added",
        description: "The photo has been added to the gallery",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add photo",
        variant: "destructive",
      });
    },
  });

  // Delete gallery photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      return apiRequest("DELETE", `/api/gallery/${photoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      toast({
        title: "Photo Deleted",
        description: "The photo has been removed from the gallery",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete photo",
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

  const openEditModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setEditCheckIn(booking.checkInDate);
    setEditCheckOut(booking.checkOutDate);
    setShowEditModal(true);
  };

  const handleUpdateDates = () => {
    if (!selectedBooking || !editCheckIn || !editCheckOut) return;

    const checkIn = new Date(editCheckIn);
    const checkOut = new Date(editCheckOut);
    
    if (checkOut <= checkIn) {
      toast({
        title: "Invalid Dates",
        description: "Check-out date must be after check-in date",
        variant: "destructive",
      });
      return;
    }

    const totalNights = differenceInDays(checkOut, checkIn);
    const totalMVR = totalNights * DAILY_RATE_MVR;
    const totalUSD = (totalMVR / USD_EXCHANGE_RATE).toFixed(2);

    updateDatesMutation.mutate({
      bookingId: selectedBooking.id,
      checkInDate: editCheckIn,
      checkOutDate: editCheckOut,
      totalNights,
      totalMVR,
      totalUSD,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Confirmed":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="mr-1 h-3 w-3" />
            Confirmed
          </Badge>
        );
      case "Rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      case "Cancelled":
        return (
          <Badge variant="secondary">
            <Ban className="mr-1 h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[1, 2, 3, 4, 5].map((i) => (
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
            <p className="text-sm text-muted-foreground">MOONLIGHT INN</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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
            title="Cancelled/Rejected"
            value={stats.cancelled}
            icon={XCircle}
            color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
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
                            {booking.phoneNumber && (
                              <p className="text-sm text-muted-foreground">{booking.phoneNumber}</p>
                            )}
                            {booking.customerNotes && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">Has notes</p>
                            )}
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
                        <TableCell data-testid={`badge-status-${booking.id}`}>
                          <div className="space-y-1">
                            {getStatusBadge(booking.status)}
                            {booking.adminNotes && booking.status === "Rejected" && (
                              <p className="text-xs text-destructive max-w-[150px] truncate" title={booking.adminNotes}>
                                {booking.adminNotes}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* View Payment Slip */}
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
                                    <DialogTitle>Booking Details</DialogTitle>
                                    <DialogDescription>
                                      {booking.fullName} - {booking.phoneNumber || "No phone"}
                                    </DialogDescription>
                                  </DialogHeader>
                                  {booking.customerNotes && (
                                    <div className="p-3 bg-muted rounded-md mb-4">
                                      <p className="text-sm font-medium mb-1">Customer Notes:</p>
                                      <p className="text-sm text-muted-foreground">{booking.customerNotes}</p>
                                    </div>
                                  )}
                                  {booking.adminNotes && (
                                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md mb-4">
                                      <p className="text-sm font-medium mb-1 text-destructive">Admin Notes:</p>
                                      <p className="text-sm text-muted-foreground">{booking.adminNotes}</p>
                                    </div>
                                  )}
                                  <div className="mt-2">
                                    <p className="text-sm font-medium mb-2">Payment Slip:</p>
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

                            {/* Edit Dates - Only for active bookings */}
                            {booking.status !== "Cancelled" && booking.status !== "Rejected" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditModal(booking)}
                                data-testid={`button-edit-${booking.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}

                            {/* Confirm - Only for pending */}
                            {booking.status === "Pending" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => confirmMutation.mutate(booking.id)}
                                disabled={confirmMutation.isPending}
                                className="text-green-600"
                                data-testid={`button-confirm-${booking.id}`}
                              >
                                {confirmMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                            )}

                            {/* Reject - Only for pending */}
                            {booking.status === "Pending" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openRejectModal(booking)}
                                className="text-red-600"
                                data-testid={`button-reject-${booking.id}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}

                            {/* Cancel - For confirmed bookings */}
                            {booking.status === "Confirmed" && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-orange-600"
                                    data-testid={`button-cancel-${booking.id}`}
                                  >
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will cancel the booking for {booking.fullName}. The dates will become available for other guests.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => cancelMutation.mutate(booking.id)}
                                      className="bg-orange-600 hover:bg-orange-700"
                                    >
                                      Cancel Booking
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}

                            {/* Delete - Always available */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  data-testid={`button-delete-${booking.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Booking?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the booking for {booking.fullName}. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(booking.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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

        {/* Gallery Management Section */}
        <Card className="mt-8">
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Photo Gallery Management
            </CardTitle>
            <Button 
              onClick={() => setShowAddPhotoDialog(true)}
              data-testid="button-add-photo"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Photo
            </Button>
          </CardHeader>
          <CardContent>
            {galleryLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="aspect-video rounded-md" />
                ))}
              </div>
            ) : galleryPhotos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No photos in gallery yet</p>
                <p className="text-sm">Click "Add Photo" to add images</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {galleryPhotos.map((photo) => (
                  <div 
                    key={photo.id} 
                    className="relative group aspect-video rounded-md overflow-hidden bg-muted"
                  >
                    <img
                      src={photo.imageUrl}
                      alt={photo.altText}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://via.placeholder.com/400x300?text=Image+Error";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="icon"
                            data-testid={`button-delete-photo-${photo.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this photo from the gallery.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePhotoMutation.mutate(photo.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                      <p className="text-white text-xs truncate">{photo.altText}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Add Photo Dialog */}
      <Dialog open={showAddPhotoDialog} onOpenChange={setShowAddPhotoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Photo to Gallery</DialogTitle>
            <DialogDescription>
              Enter the URL and description for the new photo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="photo-url">Image URL</Label>
              <Input
                id="photo-url"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                data-testid="input-photo-url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="photo-alt">Description</Label>
              <Input
                id="photo-alt"
                placeholder="e.g., Beachfront view, Room interior..."
                value={newPhotoAlt}
                onChange={(e) => setNewPhotoAlt(e.target.value)}
                data-testid="input-photo-alt"
              />
            </div>
            {newPhotoUrl && (
              <div className="rounded-md overflow-hidden bg-muted aspect-video">
                <img
                  src={newPhotoUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://via.placeholder.com/400x300?text=Invalid+URL";
                  }}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPhotoDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addPhotoMutation.mutate({ imageUrl: newPhotoUrl, altText: newPhotoAlt })}
              disabled={!newPhotoUrl || !newPhotoAlt || addPhotoMutation.isPending}
              data-testid="button-save-photo"
            >
              {addPhotoMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Add Photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dates Modal */}
      <Dialog open={showEditModal} onOpenChange={(open) => {
        setShowEditModal(open);
        if (!open) setSelectedBooking(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Booking Dates</DialogTitle>
            <DialogDescription>
              Update dates for {selectedBooking?.fullName} - Room {selectedBooking?.roomNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-checkin">Check-in Date</Label>
              <Input
                id="edit-checkin"
                type="date"
                value={editCheckIn}
                onChange={(e) => setEditCheckIn(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
                data-testid="input-edit-checkin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-checkout">Check-out Date</Label>
              <Input
                id="edit-checkout"
                type="date"
                value={editCheckOut}
                onChange={(e) => setEditCheckOut(e.target.value)}
                min={editCheckIn || format(new Date(), "yyyy-MM-dd")}
                data-testid="input-edit-checkout"
              />
            </div>
            {editCheckIn && editCheckOut && new Date(editCheckOut) > new Date(editCheckIn) && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  <strong>New Total:</strong> {differenceInDays(new Date(editCheckOut), new Date(editCheckIn))} nights = {(differenceInDays(new Date(editCheckOut), new Date(editCheckIn)) * DAILY_RATE_MVR).toLocaleString()} MVR
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateDates}
              disabled={updateDatesMutation.isPending}
              data-testid="button-save-dates"
            >
              {updateDatesMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Notes Dialog */}
      <Dialog open={showRejectModal} onOpenChange={(open) => {
        setShowRejectModal(open);
        if (!open) {
          setSelectedBooking(null);
          setRejectNotes("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Booking</DialogTitle>
            <DialogDescription>
              Rejecting booking for {selectedBooking?.fullName} - Room {selectedBooking?.roomNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-notes">Reason for Rejection (optional)</Label>
              <Textarea
                id="reject-notes"
                placeholder="e.g., Payment amount incorrect, Invalid payment slip..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-reject-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Reject Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
