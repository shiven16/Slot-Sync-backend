const prisma = require('../prisma/client');

const createBooking = async (req, res) => {
  const { userId, providerId, bookingDate, bookingTime } = req.body;

  try {
    const booking = await prisma.booking.create({
      data: {
        userId: parseInt(userId),
        providerId: parseInt(providerId),
        booking_date: new Date(bookingDate),
        booking_time: new Date(bookingTime),
        status: 'confirmed',
      }
    });
    res.status(201).json({ message: 'Booking created successfully', booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
};


const getBookingById = async (req, res) => {
  const { id } = req.params;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get booking details' });
  }
};


const cancelBooking = async (req, res) => {
  const { id } = req.params;
  try {
      const booking = await prisma.booking.findUnique({
        where: { id: parseInt(id) },
      });

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      await prisma.booking.update({
      where: { id: parseInt(id) },
      data: { status: 'cancelled' },
    });

    res.json({ message: 'Booking cancelled successfully', booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
};


const getUserBookings = async (req, res) => {
  const { id } = req.params;

  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: parseInt(id) },
    });

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'No bookings found for this user' });
    }

    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get bookings for user' });
  }
};


const getProviderBookings = async (req, res) => {
  const { id } = req.params;

  try {
    const bookings = await prisma.booking.findMany({
      where: { providerId: parseInt(id) },
    });

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'No bookings found for this provider' });
    }

    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get bookings for provider' });
  }
};


module.exports = { createBooking, getBookingById, cancelBooking, getUserBookings, getProviderBookings }