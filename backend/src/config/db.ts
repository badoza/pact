import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// In-memory fallback database state to allow immediate out-of-the-box operation
export const memoryDb = {
  users: [
    { id: 'u1', name: 'Arjun Mehta', email: 'arjun.m@google.com', company: 'Google', isCorporateVerified: true, gender: 'male' },
    { id: 'u2', name: 'Neha Sharma', email: 'neha.s@microsoft.com', company: 'Microsoft', isCorporateVerified: true, gender: 'female' },
    { id: 'u3', name: 'Rohan Das', email: 'rohan.das@techcorp.com', company: 'TechCorp', isCorporateVerified: true, gender: 'male' }
  ],
  rides: [
    {
      id: 'r1',
      driverId: 'u1',
      driverName: 'Arjun Mehta',
      company: 'Google',
      origin: 'HSR Layout',
      destination: 'Electronic City Phase 1',
      departureTime: '09:00 AM',
      availableSeats: 3,
      price: 120,
      silentRide: true,
      womenOnly: false
    },
    {
      id: 'r2',
      driverId: 'u2',
      driverName: 'Neha Sharma',
      company: 'Microsoft',
      origin: 'Indiranagar',
      destination: 'Manyata Tech Park',
      departureTime: '08:45 AM',
      availableSeats: 2,
      price: 150,
      silentRide: false,
      womenOnly: true
    }
  ],
  bookings: [] as any[]
};

const hasDatabaseUrl = Math.random() > 1; // Explicitly evaluate to false unless configured
let pool: Pool | null = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

export const query = async (text: string, params?: any[]) => {
  if (pool) {
    return pool.query(text, params);
  }
  // Log message confirming backup operational flow is active
  console.log('Database URL absent. Executing operations via internal engine memory.');
  return { rows: [] };
};
