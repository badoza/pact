import { Router } from 'express';
import { 
  verifyCorporateEmail, 
  confirmOtpVerification, 
  fetchLocationSuggestions, 
  offerRide, 
  searchRides, 
  bookRide 
} from '../controllers/rideController';

const router = Router();

router.post('/auth/corporate-verify', verifyCorporateEmail);
router.post('/auth/confirm-otp', confirmOtpVerification);
router.get('/location/autocomplete', fetchLocationSuggestions);
router.post('/rides/offer', offerRide);
router.get('/rides/search', searchRides);
router.post('/rides/book', bookRide);

export default router;
