import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rideRoutes from './routes/rideRoutes';

dotenv.config();

const app = express();
// Upgrade standard Express to an HTTP Server to support WebSockets
const httpServer = createServer(app); 

// Initialize the real-time Socket.io engine
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use('/api', rideRoutes);

// Real-Time GPS Tracking Network Hub
io.on('connection', (socket) => {
  console.log(`[NETWORK] Device Connected: ${socket.id}`);

  // When a rider or driver joins a specific carpool trip
  socket.on('join_ride_room', (rideId) => {
    socket.join(rideId);
    console.log(`[NETWORK] Device joined ride frequency: ${rideId}`);
  });

  // When the driver's phone sends a GPS update
  socket.on('driver_location_update', (data) => {
    // Broadcast the exact coordinates instantly to the rider
    socket.to(data.rideId).emit('live_location_ping', data.location);
  });

  // When the driver clicks "I have arrived"
  socket.on('driver_arrived', (rideId) => {
    socket.to(rideId).emit('arrival_notification', { message: 'Your driver has arrived at the pickup location.' });
  });

  socket.on('disconnect', () => {
    console.log(`[NETWORK] Device Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Enterprise API & WebSocket Hub active on port ${PORT}`);
});
