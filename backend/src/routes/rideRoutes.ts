import { Router } from 'express';
import { verifyCorporateEmail, offerRide, searchRides, bookRide } from '../controllers/rideController';

const router = Router();

router.post('/auth/corporate-verify', verifyCorporateEmail);
router.post('/rides/offer', offerRide);
router.get('/rides/search', searchRides);
router.post('/rides/book', bookRide);

export default router;
