import { Request, Response } from 'express';
import { memoryDb } from '../config/db';

const activeOtps: Record<string, { otp: string; expiresAt: number; userData: any }> = {};

export const verifyCorporateEmail = async (req: Request, res: Response): Promise<void> => {
  const { email, name, gender } = req.body;
  if (!email || !name || !gender) return;

  const emailDomain = email.split('@')[1];
  const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
  const companyName = emailDomain.split('.')[0].toUpperCase();
  
  activeOtps[email.toLowerCase()] = {
    otp: generatedOtp,
    expiresAt: Date.now() + 10 * 60 * 1000,
    userData: { name, email, company: companyName, gender: gender.toLowerCase() }
  };

  console.log(`\n[SECURITY] Pin for ${email}: ${generatedOtp}\n`);
  res.status(200).json({ message: 'Code generated.', debugOtpConfirmationCode: generatedOtp });
};

export const confirmOtpVerification = async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body;
  const savedRecord = activeOtps[email.toLowerCase()];

  if (!savedRecord || savedRecord.otp !== otp || Date.now() > savedRecord.expiresAt) {
    res.status(400).json({ error: 'Invalid token.' });
    return;
  }

  const newUser = { id: `u_${Date.now()}`, ...savedRecord.userData, isCorporateVerified: true };
  memoryDb.users.push(newUser);
  delete activeOtps[email.toLowerCase()];
  res.status(200).json({ message: 'Authenticated.', user: newUser });
};

// =========================================================================
// GOOGLE MAPS PLACES API INTEGRATION (Ola/Uber Standard)
// =========================================================================
export const fetchLocationSuggestions = async (req: Request, res: Response): Promise<void> => {
  const { query } = req.query;
  if (!query || (query as string).length < 2) {
    res.json({ suggestions: [] }); return;
  }

  // To unlock inch-by-inch India data, you must get a Google Maps API Key
  // and add it to your backend's .env file as GOOGLE_MAPS_API_KEY
  const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  if (GOOGLE_API_KEY) {
    try {
      // Direct connection to Google Places Autocomplete restricted to India
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query as string)}&components=country:in&key=${GOOGLE_API_KEY}`;
      const mapResponse = await fetch(url);
      const data = await mapResponse.json();
      
      const suggestions = data.predictions.map((p: any) => ({
        displayName: p.structured_formatting.main_text,
        fullAddress: p.description,
      }));
      res.json({ suggestions });
      return;
    } catch (err) {
      console.log('Google API failed, using fallback.');
    }
  }

  // Fallback Engine if you don't have a Google Key yet
  const qStr = (query as string).toLowerCase();
  const simulatedLocalData = [
    { displayName: `${query} Phase 1`, fullAddress: `${query} Phase 1, Main Road, Hyderabad, Telangana, India` },
    { displayName: `${query} Apartment Gate 2`, fullAddress: `${query} Apartment Gate 2, Bengaluru, Karnataka, India` },
    { displayName: `${query} Tech Park`, fullAddress: `${query} Tech Park, Block C, Pune, Maharashtra, India` }
  ];
  res.json({ suggestions: simulatedLocalData });
};

export const offerRide = async (req: Request, res: Response): Promise<void> => {
  const { driverId, origin, destination, departureTime, availableSeats, price } = req.body;
  const driver = memoryDb.users.find(u => u.id === driverId);
  const newRide = {
    id: `r_${Date.now()}`, driverId, driverName: driver?.name || 'Driver', company: driver?.company || 'CORP',
    origin, destination, departureTime, availableSeats: parseInt(availableSeats) || 3, price: parseFloat(price) || 100
  };
  memoryDb.rides.push(newRide);
  res.status(201).json({ message: 'Ride published.', ride: newRide });
};

export const searchRides = async (req: Request, res: Response): Promise<void> => {
  const { origin, destination, riderId } = req.query;
  const rider = memoryDb.users.find(u => u.id === riderId);
  const riderCompany = rider ? rider.company : '';

  const matches = memoryDb.rides.filter(ride => ride.availableSeats > 0);
  const processedMatches = matches.map(ride => ({
    ...ride,
    deviationMinutes: ride.company === riderCompany ? 0 : Math.floor(Math.random() * 5) + 1,
    sharesCorporateNetwork: ride.company === riderCompany
  }));
  res.json({ rides: processedMatches });
};

export const bookRide = async (req: Request, res: Response): Promise<void> => {
  const { rideId, riderId } = req.body;
  const ride = memoryDb.rides.find(r => r.id === rideId);

  if (!ride || ride.availableSeats <= 0) {
    res.status(400).json({ error: 'Ride unavailable.' }); return;
  }
  ride.availableSeats -= 1;
  const ticket = { bookingId: `b_${Date.now()}`, rideId, riderId, verificationPasscode: Math.floor(1000 + Math.random() * 9000).toString() };
  memoryDb.bookings.push(ticket);
  res.status(200).json({ message: 'Booking complete.', booking: ticket, rideDetails: ride });
};
