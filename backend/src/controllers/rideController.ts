import { Request, Response } from 'express';
import { memoryDb } from '../config/db';

// Stateful storage for active verification pins
const activeOtps: Record<string, { otp: string; expiresAt: number; userData: any }> = {};

export const verifyCorporateEmail = async (req: Request, res: Response): Promise<void> => {
  const { email, name, gender } = req.body;
  if (!email || !name || !gender) {
    res.status(400).json({ error: 'Name, corporate email identity, and gender registration parameters are required.' });
    return;
  }

  const emailDomain = email.split('@')[1];
  const allowedCorporateDomains = ['google.com', 'microsoft.com', 'meta.com', 'apple.com', 'techcorp.com', 'pact.com'];

  if (!allowedCorporateDomains.includes(emailDomain.toLowerCase())) {
    res.status(400).json({ error: 'Access denied. Pact verification requires a recognized enterprise corporate email domain.' });
    return;
  }

  // Generate a real 4-digit verification pin code
  const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
  const companyName = emailDomain.split('.')[0].toUpperCase();
  
  // Save OTP state with a 5-minute expiration window
  activeOtps[email.toLowerCase()] = {
    otp: generatedOtp,
    expiresAt: Date.now() + 5 * 60 * 1000,
    userData: {
      name,
      email,
      company: companyName,
      gender: gender.toLowerCase()
    }
  };

  // PRODUCTION NOTE: Integrate an SMTP provider (Nodemailer/Resend) here to dispatch the email.
  // For immediate launch testing, we echo it back in the logs and response safety envelope.
  console.log(`[PACT SECURITY CONTROL] Verification code for ${email}: ${generatedOtp}`);

  res.status(200).json({ 
    message: 'Verification security pin generated successfully.',
    debugOtpConfirmationCode: generatedOtp // Provided for direct out-of-the-box browser validation testing
  });
};

export const confirmOtpVerification = async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    res.status(400).json({ error: 'Target email context and matching verification token parameters are required.' });
    return;
  }

  const savedRecord = activeOtps[email.toLowerCase()];
  if (!savedRecord) {
    res.status(400).json({ error: 'No active verification sequence found for this email container address.' });
    return;
  }

  if (Date.now() > savedRecord.expiresAt) {
    delete activeOtps[email.toLowerCase()];
    res.status(400).json({ error: 'Verification token lifetime matrix expired. Please request a new security code.' });
    return;
  }

  if (savedRecord.otp !== otp) {
    res.status(400).json({ error: 'Invalid security code credentials entered. Verification handshake aborted.' });
    return;
  }

  const newUser = {
    id: `u_${Date.now()}`,
    ...savedRecord.userData,
    isCorporateVerified: true
  };

  memoryDb.users.push(newUser);
  delete activeOtps[email.toLowerCase()];

  res.status(200).json({ message: 'Identity verified successfully.', user: newUser });
};

export const fetchLocationSuggestions = async (req: Request, res: Response): Promise<void> => {
  const { query } = req.query;
  if (!query || (query as string).length < 3) {
    res.json({ suggestions: [] });
    return;
  }

  try {
    // Live endpoint handshake targeting OpenStreetMap global spatial indices database network
    const mapResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query as string)}&limit=5`,
      { headers: { 'User-Agent': 'PactCarpoolEnterpriseAppEngine/1.0.0' } }
    );
    const elements = await mapResponse.json();
    
    const structuredSuggestions = elements.map((item: any) => ({
      displayName: item.display_name,
      lat: item.lat,
      lon: item.lon
    }));

    res.json({ suggestions: structuredSuggestions });
  } catch (err) {
    res.status(500).json({ error: 'Error processing spatial geocoding matrix requests.' });
  }
};

export const offerRide = async (req: Request, res: Response): Promise<void> => {
  const { driverId, origin, destination, departureTime, availableSeats, price, silentRide, womenOnly } = req.body;

  if (!driverId || !origin || !destination || !departureTime || !availableSeats || !price) {
    res.status(400).json({ error: 'Missing core payload metrics parameters for offering a ride profile.' });
    return;
  }

  const driver = memoryDb.users.find(u => u.id === driverId);
  const driverName = driver ? driver.name : 'Verified Driver';
  const company = driver ? driver.company : 'ENTERPRISE POOL';

  const newRide = {
    id: `r_${Date.now()}`,
    driverId,
    driverName,
    company,
    origin,
    destination,
    departureTime,
    availableSeats: parseInt(availableSeats),
    price: parseFloat(price),
    silentRide: !!silentRide,
    womenOnly: !!womenOnly
  };

  memoryDb.rides.push(newRide);
  res.status(201).json({ message: 'Ride route indexed into systemic memory allocation.', ride: newRide });
};

export const searchRides = async (req: Request, res: Response): Promise<void> => {
  const { origin, destination, riderId } = req.query;

  if (!origin || !destination || !riderId) {
    res.status(400).json({ error: 'Origin routing parameters, target destination bounds, and verified rider target parameters are required.' });
    return;
  }

  const rider = memoryDb.users.find(u => u.id === riderId);
  const riderGender = rider ? rider.gender : 'male';
  const riderCompany = rider ? rider.company : '';

  // Match filtering system matching real geographic parameters strings variations mapping logic
  const matches = memoryDb.rides.filter(ride => {
    if (ride.availableSeats <= 0) return false;
    if (ride.womenOnly && riderGender !== 'female') return false;

    // Clean match string evaluations checks
    const targetOriginStr = (origin as string).split(',')[0].toLowerCase().trim();
    const targetDestStr = (destination as string).split(',')[0].toLowerCase().trim();

    const originMatch = ride.origin.toLowerCase().includes(targetOriginStr) || targetOriginStr.includes(ride.origin.toLowerCase());
    const destinationMatch = ride.destination.toLowerCase().includes(targetDestStr) || targetDestStr.includes(ride.destination.toLowerCase());

    return originMatch || destinationMatch;
  });

  const localizedCalculatedMatches = matches.map(ride => {
    const sharesSameEnterpriseContext = ride.company.toLowerCase() === riderCompany.toLowerCase();
    const mockDeviationMinutes = sharesSameEnterpriseContext ? 1 : Math.floor(Math.random() * 6) + 2;

    return {
      ...ride,
      deviationMinutes: mockDeviationMinutes,
      sharesCorporateNetwork: sharesSameEnterpriseContext
    };
  });

  res.json({ rides: localizedCalculatedMatches });
};

export const bookRide = async (req: Request, res: Response): Promise<void> => {
  const { rideId, riderId } = req.body;

  if (!rideId || !riderId) {
    res.status(400).json({ error: 'Ride token and rider verification signatures are required to finalize booking agreements.' });
    return;
  }

  const ride = memoryDb.rides.find(r => r.id === rideId);
  if (!ride) {
    res.status(404).json({ error: 'The specified ride route itinerary cannot be located.' });
    return;
  }

  if (ride.availableSeats <= 0) {
    res.status(400).json({ error: 'Booking failure. Available seating capacity for this ride route has been filled.' });
    return;
  }

  ride.availableSeats -= 1;
  const bookingReceipt = {
    bookingId: `b_${Date.now()}`,
    rideId,
    riderId,
    status: 'confirmed',
    verificationPasscode: Math.floor(1000 + Math.random() * 9000).toString()
  };

  memoryDb.bookings.push(bookingReceipt);
  res.status(200).json({ message: 'Carpool route transaction completed successfully.', booking: bookingReceipt });
};
