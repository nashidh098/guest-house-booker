import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, differenceInDays, parseISO } from "date-fns";
import { CalendarIcon, User, CreditCard, Building2, Copy, Check, Upload, X, Loader2, Phone, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ROOMS, BANK_ACCOUNTS, DAILY_RATE_MVR, USD_EXCHANGE_RATE, type Booking } from "@shared/schema";

const bookingFormSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  idNumber: z.string().min(3, "ID/Passport number is required"),
  phoneNumber: z.string().min(7, "Phone number is required"),
  customerNotes: z.string().optional(),
  roomNumber: z.string().min(1, "Please select a room"),
  checkInDate: z.string().min(1, "Check-in date is required"),
  checkOutDate: z.string().min(1, "Check-out date is required"),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

const GUESTHOUSE_IMAGES = [
  { src: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80", alt: "Beachfront view" },
  { src: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80", alt: "Luxury room interior" },
  { src: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80", alt: "Ocean view room" },
  { src: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80", alt: "Resort pool area" },
  { src: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80", alt: "Tropical paradise" },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [isRoomUnavailable, setIsRoomUnavailable] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);

  const autoplayPlugin = useMemo(() => Autoplay({ delay: 4000, stopOnInteraction: false }), []);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [autoplayPlugin]);

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      fullName: "",
      idNumber: "",
      phoneNumber: "",
      customerNotes: "",
      roomNumber: "",
      checkInDate: "",
      checkOutDate: "",
    },
  });

  const watchCheckIn = form.watch("checkInDate");
  const watchCheckOut = form.watch("checkOutDate");
  const watchRoom = form.watch("roomNumber");

  // Calculate pricing
  const calculatePricing = () => {
    if (!watchCheckIn || !watchCheckOut) {
      return { nights: 0, totalMVR: 0, totalUSD: "0.00" };
    }
    const checkIn = parseISO(watchCheckIn);
    const checkOut = parseISO(watchCheckOut);
    const nights = differenceInDays(checkOut, checkIn);
    if (nights <= 0) {
      return { nights: 0, totalMVR: 0, totalUSD: "0.00" };
    }
    const totalMVR = nights * DAILY_RATE_MVR;
    const totalUSD = (totalMVR / USD_EXCHANGE_RATE).toFixed(2);
    return { nights, totalMVR, totalUSD };
  };

  const pricing = calculatePricing();

  // Check availability query
  const { refetch: checkAvailability, isFetching: checkingAvailability } = useQuery({
    queryKey: ["/api/bookings/check-availability", watchRoom, watchCheckIn, watchCheckOut],
    queryFn: async () => {
      if (!watchRoom || !watchCheckIn || !watchCheckOut) return { available: true };
      const res = await fetch(`/api/bookings/check-availability?roomNumber=${watchRoom}&checkIn=${watchCheckIn}&checkOut=${watchCheckOut}`);
      return res.json();
    },
    enabled: false,
  });

  // Check availability when dates or room change
  const handleAvailabilityCheck = async () => {
    if (watchRoom && watchCheckIn && watchCheckOut && pricing.nights > 0) {
      const result = await checkAvailability();
      if (result.data && !result.data.available) {
        setIsRoomUnavailable(true);
        setAvailabilityMessage("Room already booked for selected dates");
      } else {
        setIsRoomUnavailable(false);
        setAvailabilityMessage(null);
      }
    }
  };

  // Booking mutation
  const bookingMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch("/api/bookings", {
        method: "POST",
        body: data,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create booking");
      }
      return res.json();
    },
    onSuccess: (booking: Booking) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Successful!",
        description: "Your booking has been submitted. Redirecting to invoice...",
      });
      setLocation(`/invoice/${booking.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image under 5MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const copyToClipboard = async (text: string, accountId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedAccount(accountId);
    toast({
      title: "Copied!",
      description: "Account number copied to clipboard",
    });
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const onSubmit = async (values: BookingFormValues) => {
    if (isRoomUnavailable) {
      toast({
        title: "Room Unavailable",
        description: "Please select different dates or another room",
        variant: "destructive",
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: "Payment Slip Required",
        description: "Please upload your bank transfer slip",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("fullName", values.fullName);
    formData.append("idNumber", values.idNumber);
    formData.append("phoneNumber", values.phoneNumber);
    formData.append("customerNotes", values.customerNotes || "");
    formData.append("roomNumber", values.roomNumber);
    formData.append("checkInDate", values.checkInDate);
    formData.append("checkOutDate", values.checkOutDate);
    formData.append("totalNights", pricing.nights.toString());
    formData.append("totalMVR", pricing.totalMVR.toString());
    formData.append("totalUSD", pricing.totalUSD);
    formData.append("paymentSlip", selectedFile);

    bookingMutation.mutate(formData);
  };

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-[50vh] md:h-[60vh] bg-gradient-to-br from-primary/90 to-primary overflow-hidden">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2" data-testid="text-hero-title">
            Welcome to MOONLIGHT INN
          </h1>
          <div className="flex items-center gap-2 text-white/80 mb-4" data-testid="text-hero-location">
            <MapPin className="h-5 w-5" />
            <span className="text-lg">Sh.Maaungoodhoo, Maldives</span>
          </div>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl" data-testid="text-hero-subtitle">
            Experience comfort and luxury in the heart of Maldives
          </p>
          <Button
            size="lg"
            className="mt-8 bg-white text-primary hover:bg-white/90"
            onClick={() => document.getElementById("booking-form")?.scrollIntoView({ behavior: "smooth" })}
            data-testid="button-book-now"
          >
            Book Your Stay
          </Button>
        </div>
      </div>

      {/* Photo Gallery Section */}
      <div className="py-12 bg-muted/50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8" data-testid="text-gallery-title">
            Our Beautiful Property
          </h2>
          <div className="relative">
            <div className="overflow-hidden rounded-xl" ref={emblaRef}>
              <div className="flex">
                {GUESTHOUSE_IMAGES.map((image, index) => (
                  <div key={index} className="flex-[0_0_100%] min-w-0 md:flex-[0_0_50%] lg:flex-[0_0_33.33%] px-2">
                    <div className="aspect-[4/3] overflow-hidden rounded-lg">
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="w-full h-full object-cover transition-opacity duration-300 hover:opacity-90"
                        data-testid={`img-gallery-${index}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
              onClick={scrollPrev}
              data-testid="button-gallery-prev"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm"
              onClick={scrollNext}
              data-testid="button-gallery-next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Booking Form Section */}
      <div id="booking-form" className="max-w-4xl mx-auto px-4 py-12 md:py-20">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl md:text-3xl" data-testid="text-form-title">Reserve Your Room</CardTitle>
            <CardDescription className="text-base">Fill in your details to book your stay at MOONLIGHT INN</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Guest Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Guest Details
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your full name" 
                            {...field} 
                            data-testid="input-full-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="idNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Card / Passport Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your ID or passport number" 
                            {...field}
                            data-testid="input-id-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your phone number" 
                            type="tel"
                            {...field}
                            data-testid="input-phone-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Room Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Room Selection
                  </h3>

                  <FormField
                    control={form.control}
                    name="roomNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Room</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            setTimeout(handleAvailabilityCheck, 100);
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-room">
                              <SelectValue placeholder="Select a room" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ROOMS.map((room) => (
                              <SelectItem key={room.number} value={room.number.toString()}>
                                {room.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="checkInDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Check-in Date</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                type="date" 
                                min={today}
                                className="pl-10"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  setTimeout(handleAvailabilityCheck, 100);
                                }}
                                data-testid="input-check-in"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="checkOutDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Check-out Date</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                type="date" 
                                min={watchCheckIn || today}
                                className="pl-10"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  setTimeout(handleAvailabilityCheck, 100);
                                }}
                                data-testid="input-check-out"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Availability Message */}
                  {availabilityMessage && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm" data-testid="text-availability-error">
                      {availabilityMessage}
                    </div>
                  )}

                  {checkingAvailability && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking availability...
                    </div>
                  )}
                </div>

                {/* Pricing Card */}
                {pricing.nights > 0 && (
                  <Card className="bg-primary/5 border-l-4 border-l-primary">
                    <CardContent className="pt-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Duration</p>
                          <p className="font-semibold" data-testid="text-nights">{pricing.nights} Night{pricing.nights > 1 ? 's' : ''}</p>
                          <p className="text-xs text-muted-foreground">{DAILY_RATE_MVR} MVR per night</p>
                        </div>
                        <div className="flex gap-6">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Total (MVR)</p>
                            <p className="text-2xl font-bold text-primary" data-testid="text-total-mvr">{pricing.totalMVR.toLocaleString()} MVR</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Total (USD)</p>
                            <p className="text-2xl font-bold" data-testid="text-total-usd">${pricing.totalUSD}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Bank Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Bank Transfer Details
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Please transfer the total amount to one of the following accounts
                  </p>

                  <Accordion type="single" collapsible className="w-full">
                    {BANK_ACCOUNTS.map((bank, index) => (
                      <AccordionItem key={index} value={`bank-${index}`}>
                        <AccordionTrigger className="hover:no-underline" data-testid={`accordion-bank-${index}`}>
                          <span className="font-medium">{bank.bankName}</span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            <div className="p-3 bg-muted rounded-lg">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium">MVR Account</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(bank.mvrAccount, `${index}-mvr`)}
                                  data-testid={`button-copy-mvr-${index}`}
                                >
                                  {copiedAccount === `${index}-mvr` ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <p className="font-mono text-lg" data-testid={`text-mvr-account-${index}`}>{bank.mvrAccount}</p>
                              <p className="text-sm text-muted-foreground">Account Name: {bank.accountName}</p>
                            </div>

                            <div className="p-3 bg-muted rounded-lg">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium">USD Account</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(bank.usdAccount, `${index}-usd`)}
                                  data-testid={`button-copy-usd-${index}`}
                                >
                                  {copiedAccount === `${index}-usd` ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <p className="font-mono text-lg" data-testid={`text-usd-account-${index}`}>{bank.usdAccount}</p>
                              <p className="text-sm text-muted-foreground">Account Name: {bank.accountName}</p>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>

                {/* Payment Upload */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    Upload Payment Slip
                  </h3>

                  {!filePreview ? (
                    <label 
                      className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-input rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      data-testid="input-file-dropzone"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">PNG, JPG or PDF (Max 5MB)</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                        data-testid="input-file"
                      />
                    </label>
                  ) : (
                    <div className="relative w-full p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-4">
                        <img 
                          src={filePreview} 
                          alt="Payment slip preview" 
                          className="h-24 w-24 object-cover rounded-md"
                          data-testid="img-file-preview"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{selectedFile?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedFile && (selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={removeFile}
                          data-testid="button-remove-file"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Customer Notes */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="customerNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Requests or Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any special requests, early check-in, dietary requirements, etc." 
                            className="min-h-[100px]"
                            {...field}
                            data-testid="input-customer-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full md:max-w-md md:mx-auto md:flex"
                  disabled={isRoomUnavailable || bookingMutation.isPending || !selectedFile}
                  data-testid="button-submit-booking"
                >
                  {bookingMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Complete Booking"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-muted py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-lg font-semibold mb-2">MOONLIGHT INN</p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-3">
            <MapPin className="h-4 w-4" />
            <span data-testid="text-location">Sh.Maaungoodhoo, Maldives</span>
          </div>
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span data-testid="text-contact">9994026</span>
            </div>
            <Button size="sm" asChild data-testid="button-call">
              <a href="tel:9994026">
                <Phone className="mr-2 h-4 w-4" />
                Call Us
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">All rights reserved 2024</p>
        </div>
      </footer>
    </div>
  );
}
