import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rideRoutes from './routes/rideRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Main functional application endpoint integrations
app.use('/api', rideRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'Pact Commute API Engine Engine Framework Architecture',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 System framework listening execution sequences on port ${PORT}`);
});
