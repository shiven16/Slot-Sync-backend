const express = require('express');
const { createBooking, getBookingById, cancelBooking, getUserBookings, getProviderBookings } = require('../controllers/bookingController');
// const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', createBooking);
router.get('/:id', getBookingById);
router.put('/:id/cancel', cancelBooking);
router.get('/user/:id', getUserBookings);
router.get('/provider/:id', getProviderBookings);

module.exports = router;
