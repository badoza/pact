import { Request, Response } from 'express';
import { memoryDb } from '../config/db';

export const verifyCorporateEmail = async (req: Request, res: Response): Promise<void> => {
  const { email, name, gender } = req.body;
  if (!email || !name || !gender) {
    res.status(400).json({ error: 'Name, corporate email identity, and gender registration parameters are required.' });
    return;
  }

  const emailDomain = email.split('@')[1];
  const allowedCorporateDomains = ['google.com', 'microsoft.com', 'meta.com', 'apple.com', 'techcorp.com'];

  if (!allowedCorporateDomains.includes(emailDomain.toLowerCase())) {
    res.status(400).json({ error: 'Access denied. Pact verification requires a recognized enterprise corporate email domain.' });
    return;
  }

  const companyName = emailDomain.split('.')[0].toUpperCase();
  const newUser = {
    id: `u_${Date.now()}`,
    name,
    email,
    company: companyName,
    isCorporateVerified: true,
    gender: gender.toLowerCase()
  };

  memoryDb.users.push(newUser);
  res.status(201).json({ message: 'Corporate profile verification handshake successful.', user: newUser });
};

export const offerRide = async (req: Request, res: Response): Promise<void> => {
  const { driverId, origin, destination, departureTime, availableSeats, price, silentRide, womenOnly } = req.body;

  if (!driverId || !origin || !destination || !departureTime || !availableSeats || !price) {
    res.status(400).json({ error: 'Missing core payload metrics parameters for offering a ride profile.' });
    return;
  }

  const driver = memoryDb.users.find(u => u.id === driverId);
  if (!driver) {
    res.status(404).json({ error: 'Driver identity tracking validation failed.' });
    return;
  }

  const newRide = {
    id: `r_${Date.now()}`,
    driverId,
    driverName: driver.name,
    company: driver.company,
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
  if (!rider) {
    res.status(404).json({ error: 'Rider identity parameters not recognized by system memory engine.' });
    return;
  }

  // Simulate geospatial querying filter parameters with dynamic deviation evaluation metrics logic
  const matches = memoryDb.rides.filter(ride => {
    const originMatch = ride.origin.toLowerCase().includes((origin as string).toLowerCase());
    const destinationMatch = ride.destination.toLowerCase().includes((destination as string).toLowerCase());
    
    if (ride.womenOnly && rider.gender !== 'female') {
      return false;
    }

    return originMatch || destinationMatch;
  });

  const localizedCalculatedMatches = matches.map(ride => {
    const sharesSameEnterpriseContext = ride.company.toLowerCase() === rider.company.toLowerCase();
    const mockDeviationMinutes = sharesSameEnterpriseContext ? 2 : Math.floor(Math.random() * 8) + 3;

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
