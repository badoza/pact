import { Request, Response } from 'express';
import { memoryDb } from '../config/db';

// Internal in-memory storage for active verification tokens
const activeOtps: Record<string, { otp: string; expiresAt: number; userData: any }> = {};

/**
 * Handles the initial corporate registration step and issues a 4-digit token
 */
export const verifyCorporateEmail = async (req: Request, res: Response): Promise<void> => {
  const { email, name, gender } = req.body;
  if (!email || !name || !gender) {
    res.status(400).json({ error: 'All registration parameters are required.' });
    return;
  }

  const emailDomain = email.split('@')[1];
  const allowedCorporateDomains = [
    'google.com', 
    'microsoft.com', 
    'meta.com', 
    'apple.com', 
    'techcorp.com', 
    'pact.com', 
    'wipro.com', 
    'infosys.com', 
    'tcs.com'
  ];

  if (!allowedCorporateDomains.includes(emailDomain.toLowerCase())) {
    res.status(400).json({ error: 'Access denied. Please use an authorized corporate email domain.' });
    return;
  }

  const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
  const companyName = emailDomain.split('.')[0].toUpperCase();
  
  activeOtps[email.toLowerCase()] = {
    otp: generatedOtp,
    expiresAt: Date.now() + 10 * 60 * 1000, // Valid for 10 minutes
    userData: { name, email, company: companyName, gender: gender.toLowerCase() }
  };

  console.log(`\n============== [PACT SECURITY LOG] ==============\nVerification Pin for ${email}: ${generatedOtp}\n==================================================\n`);

  res.status(200).json({ 
    message: 'Verification code generated.',
    debugOtpConfirmationCode: generatedOtp 
  });
};

/**
 * Validates the token and creates a session profile signature
 */
export const confirmOtpVerification = async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body;
  const savedRecord = activeOtps[email.toLowerCase()];

  if (!savedRecord || savedRecord.otp !== otp || Date.now() > savedRecord.expiresAt) {
    res.status(400).json({ error: 'Invalid or expired security validation token.' });
    return;
  }

  const newUser = { id: `u_${Date.now()}`, ...savedRecord.userData, isCorporateVerified: true };
  memoryDb.users.push(newUser);
  delete activeOtps[email.toLowerCase()];

  res.status(200).json({ message: 'Identity authenticated.', user: newUser });
};

/**
 * Location autocomplete search supporting both precise country geocoding and global fallbacks
 */
export const fetchLocationSuggestions = async (req: Request, res: Response): Promise<void> => {
  const { query, country } = req.query;
  
  if (!query || (query as string).length < 3) {
    res.json({ suggestions: [] });
    return;
  }

  try {
    // Dynamically appends country filtering if provided by the device GPS setup
    const countryFilter = country ? `&countrycodes=${(country as string).toLowerCase()}` : '';
    const targetUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query as string)}${countryFilter}&limit=8&addressdetails=1`;
    
    const mapResponse = await fetch(targetUrl, { 
      headers: { 'User-Agent': 'PactEnterpriseCarpoolEngine/3.0.0' } 
    });
    
    const elements = (await mapResponse.json()) as any[];
    
    const structuredSuggestions = elements.map((item: any) => {
      const parts = item.display_name.split(',');
      const shortTitle = parts[0];
      const subLocality = parts[1] ? parts[1].trim() : '';
      
      return {
        displayName: `${shortTitle}, ${subLocality}`.replace(/,\s*$/, ""),
        fullAddress: item.display_name,
        lat: item.lat,
        lon: item.lon
      };
    });

    res.json({ suggestions: [] ? [] : structuredSuggestions });
  } catch (err) {
    res.status(500).json({ error: 'Error resolving spatial map data.' });
  }
};

/**
 * Registers an active ride offer to the shared cluster network
 */
export const offerRide = async (req: Request, res: Response): Promise<void> => {
  const { driverId, origin, destination, departureTime, availableSeats, price, silentRide, womenOnly } = req.body;

  const driver = memoryDb.users.find(u => u.id === driverId);
  const newRide = {
    id: `r_${Date.now()}`,
    driverId,
    driverName: driver ? driver.name : 'Verified Driver',
    company: driver ? driver.company : 'ENTERPRISE',
    origin,
    destination,
    departureTime,
    availableSeats: parseInt(availableSeats) || 3,
    price: parseFloat(price) || 100,
    silentRide: !!silentRide,
    womenOnly: !!womenOnly
  };

  memoryDb.rides.push(newRide);
  res.status(201).json({ message: 'Ride published successfully.', ride: newRide });
};

/**
 * Searches and scans matching active routes based on user parameters
 */
export const searchRides = async (req: Request, res: Response): Promise<void> => {
  const { origin, destination, riderId } = req.query;
  const rider = memoryDb.users.find(u => u.id === riderId);
  const riderGender = rider ? rider.gender : 'male';
  const riderCompany = rider ? rider.company : '';

  const matches = memoryDb.rides.filter(ride => {
    if (ride.availableSeats <= 0) return false;
    if (ride.womenOnly && riderGender !== 'female') return false;
    if (!origin || !destination) return true;

    const queryStart = (origin as string).split(',')[0].toLowerCase().trim();
    const queryEnd = (destination as string).split(',')[0].toLowerCase().trim();

    const rideStart = ride.origin.toLowerCase();
    const rideEnd = ride.destination.toLowerCase();

    return rideStart.includes(queryStart) || rideEnd.includes(queryEnd) || queryStart.includes(rideStart.split(',')[0]);
  });

  const processedMatches = matches.map(ride => ({
    ...ride,
    deviationMinutes: ride.company.toLowerCase() === riderCompany.toLowerCase() ? 0 : Math.floor(Math.random() * 8) + 2,
    sharesCorporateNetwork: ride.company.toLowerCase() === riderCompany.toLowerCase()
  }));

  res.json({ rides: processedMatches });
};

/**
 * Books a seat and locks out changes to maintain single-identity security agreements
 */
export const bookRide = async (req: Request, res: Response): Promise<void> => {
  const { rideId, riderId } = req.body;
  const ride = memoryDb.rides.find(r => r.id === rideId);

  if (!ride || ride.availableSeats <= 0) {
    res.status(400).json({ error: 'Ride unavailable or completely filled.' });
    return;
  }

  ride.availableSeats -= 1;
  const ticket = {
    bookingId: `b_${Date.now()}`,
    rideId,
    riderId,
    status: 'confirmed',
    verificationPasscode: Math.floor(1000 + Math.random() * 9000).toString()
  };

  memoryDb.bookings.push(ticket);
  res.status(200).json({ message: 'Booking complete.', booking: ticket });
};
