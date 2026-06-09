import { Request, Response } from 'express';
import { memoryDb } from '../config/db';

const activeOtps: Record<string, { otp: string; expiresAt: number; userData: any }> = {};

export const verifyCorporateEmail = async (req: Request, res: Response): Promise<void> => {
  const { email, name, gender } = req.body;
  if (!email || !name || !gender) {
    res.status(400).json({ error: 'All registration parameters are required.' });
    return;
  }

  const emailDomain = email.split('@')[1];
  const allowedDomains = ['google.com', 'microsoft.com', 'meta.com', 'apple.com', 'techcorp.com', 'pact.com', 'wipro.com', 'infosys.com', 'tcs.com'];

  if (!allowedDomains.includes(emailDomain.toLowerCase())) {
    res.status(400).json({ error: 'Access denied. Please use an authorized corporate email domain.' });
    return;
  }

  const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
  
  activeOtps[email.toLowerCase()] = {
    otp: generatedOtp,
    expiresAt: Date.now() + 10 * 60 * 1000,
    userData: { name, email, company: emailDomain.split('.')[0].toUpperCase(), gender: gender.toLowerCase() }
  };

  console.log(`\n============== [PACT SECURITY] ==============\nPin for ${email}: ${generatedOtp}\n=============================================\n`);

  res.status(200).json({ message: 'Code generated.', debugOtpConfirmationCode: generatedOtp });
};

export const confirmOtpVerification = async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body;
  const savedRecord = activeOtps[email.toLowerCase()];

  if (!savedRecord || savedRecord.otp !== otp || Date.now() > savedRecord.expiresAt) {
    res.status(400).json({ error: 'Invalid or expired token.' });
    return;
  }

  const newUser = { id: `u_${Date.now()}`, ...savedRecord.userData, isCorporateVerified: true };
  memoryDb.users.push(newUser);
  delete activeOtps[email.toLowerCase()];
  res.status(200).json({ message: 'Authenticated.', user: newUser });
};

// =========================================================================
// ENTERPRISE MAPBOX INTEGRATION (100,000 Free Requests / Month)
// =========================================================================
export const fetchLocationSuggestions = async (req: Request, res: Response): Promise<void> => {
  const { query, country } = req.query;
  
  if (!query || (query as string).length < 2) {
    res.json({ suggestions: [] });
    return;
  }

  const MAPBOX_API_KEY = process.env.MAPBOX_API_KEY;

  if (MAPBOX_API_KEY) {
    try {
      // Prioritizes the user's GPS country, pulls deep local POI data
      const countryFilter = country ? `&country=${(country as string).toLowerCase()}` : '';
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query as string)}.json?autocomplete=true${countryFilter}&limit=8&access_token=${MAPBOX_API_KEY}`;
      
      const mapResponse = await fetch(url);
      const data = await mapResponse.json();
      
      const suggestions = data.features.map((f: any) => ({
        displayName: f.text + (f.context ? `, ${f.context[0].text}` : ''),
        fullAddress: f.place_name,
        lat: f.center[1], // Mapbox returns coordinates as [longitude, latitude]
        lon: f.center[0]
      }));

      res.json({ suggestions });
      return;
    } catch (err) {
      console.log('[API ERROR] Mapbox cluster offline. Engaging fallback logic.');
    }
  }

  // Safety Fallback: Runs if you forget to add your API Key
  const simulatedLocalData = [
    { displayName: `Please add Mapbox API Key to .env`, fullAddress: `System Warning`, lat: 0, lon: 0 }
  ];
  res.json({ suggestions: simulatedLocalData });
};

export const offerRide = async (req: Request, res: Response): Promise<void> => {
  const { driverId, origin, destination, departureTime, availableSeats, price, silentRide, womenOnly } = req.body;
  const driver = memoryDb.users.find(u => u.id === driverId);
  const newRide = {
    id: `r_${Date.now()}`, driverId, driverName: driver?.name || 'Verified Driver', company: driver?.company || 'ENTERPRISE',
    origin, destination, departureTime, availableSeats: parseInt(availableSeats) || 3, price: parseFloat(price) || 100,
    silentRide: !!silentRide, womenOnly: !!womenOnly
  };
  memoryDb.rides.push(newRide);
  res.status(201).json({ message: 'Ride published.', ride: newRide });
};

export const searchRides = async (req: Request, res: Response): Promise<void> => {
  const { origin, destination, riderId } = req.query;
  const rider = memoryDb.users.find(u => u.id === riderId);

  const matches = memoryDb.rides.filter(ride => {
    if (ride.availableSeats <= 0) return false;
    if (ride.womenOnly && rider?.gender !== 'female') return false;
    return true; // Returns all available rides in this demo phase
  });

  const processedMatches = matches.map(ride => ({
    ...ride,
    deviationMinutes: ride.company === rider?.company ? 0 : Math.floor(Math.random() * 5) + 1,
    sharesCorporateNetwork: ride.company === rider?.company
  }));

  res.json({ rides: processedMatches });
};

export const bookRide = async (req: Request, res: Response): Promise<void> => {
  const { rideId, riderId } = req.body;
  const ride = memoryDb.rides.find(r => r.id === rideId);

  if (!ride || ride.availableSeats <= 0) {
    res.status(400).json({ error: 'Ride unavailable.' });
    return;
  }
  ride.availableSeats -= 1;
  const ticket = { bookingId: `b_${Date.now()}`, rideId, riderId, verificationPasscode: Math.floor(1000 + Math.random() * 9000).toString() };
  memoryDb.bookings.push(ticket);
  res.status(200).json({ message: 'Booking complete.', booking: ticket });
};
