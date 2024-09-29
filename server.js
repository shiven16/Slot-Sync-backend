const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { errorMonitor } = require('nodemailer/lib/xoauth2');

const app = express();
const prisma = new PrismaClient();
app.use(express.json());

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

app.post('/auth/register', [
    body('username').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = await prisma.user.create({
            data: {
                username,
                email,
                password_hash: hashedPassword,
                role: 'user' 
            },
        });
        res.status(201).json({ id: user.id, username: user.username });
    } catch (error) {
        res.status(400).json({ error: 'User registration failed' });
    }
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

app.get('/users/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
            },
        });
        res.json(user);
    } catch (error) {
        res.status(404).json({ error: 'User not found' });
    }
});

app.put('/users/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { username, email, password } = req.body;

    const data = {};
    if (username) data.username = username;
    if (email) data.email = email;
    if (password) data.password_hash = await bcrypt.hash(password, 10);

    try {
        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data,
        });
        res.json(updatedUser);
    } catch (error) {
        res.status(400).json({ error: 'Update failed' });
    }
});

app.post('/providers', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }

    const { service_type, location, contact_number } = req.body;

    try {
        const serviceProvider = await prisma.serviceProvider.create({
            data: {
                userId: req.user.id,
                service_type,
                location,
                contact_number,
            },
        });
        res.status(201).json(serviceProvider);
    } catch (error) {
        res.status(400).json({ error: 'Service provider creation failed' });
    }
});

app.get('/providers/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const provider = await prisma.serviceProvider.findUnique({
            where: { id: parseInt(id) },
        });
        res.json(provider);
    } catch (error) {
        res.status(404).json({ error: 'Service provider not found' });
    }
});

app.put('/providers/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;
    const { service_type, location, contact_number } = req.body;

    try {
        const updatedProvider = await prisma.serviceProvider.update({
            where: { id: parseInt(id) },
            data: {
                service_type,
                location,
                contact_number,
            },
        });
        res.json(updatedProvider);
    } catch (error) {
        res.status(400).json({ error: 'Update failed' });
    }
});

app.get('/providers/:id/availability', async (req, res) => {
    const { id } = req.params;

    try {
        const availability = await prisma.availability.findMany({
            where: { providerId: parseInt(id) },
        });
        res.json(availability);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve availability' });
    }
});

app.post('/bookings', authenticateToken, async (req, res) => {
    const { providerId, booking_date, booking_time } = req.body;

    try {
        const booking = await prisma.booking.create({
            data: {
                userId: req.user.id,
                providerId,
                booking_date: new Date(booking_date),
                booking_time: new Date(booking_time),
                status: 'confirmed'
            },
        });

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Booking Confirmation',
            text: `Your booking has been confirmed for ${booking_date} at ${booking_time}.`,
        };

        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                return res.status(500).json({ error: 'Email sending failed' });
            }
        });

        res.status(201).json(booking);
    } catch (error) {
        res.status(400).json({ error: 'Booking creation failed' });
    }
});

app.get('/bookings/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(id) },
        });
        res.json(booking);
    } catch (error) {
        res.status(404).json({ error: 'Booking not found' });
    }
});

app.put('/bookings/:id/cancel', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const canceledBooking = await prisma.booking.update({
            where: { id: parseInt(id) },
            data: { status: 'cancelled' },
        });
        res.json(canceledBooking);
    } catch (error) {
        res.status(400).json({ error: 'Cancelation failed' });
    }
});

app.get('/bookings/user/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const bookings = await prisma.booking.findMany({
            where: { userId: parseInt(id) },
        });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve bookings' });
    }
});

app.get('/bookings/provider/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const bookings = await prisma.booking.findMany({
            where: { providerId: parseInt(id) },
        });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve bookings' });
    }
});

app.post('/availability', authenticateToken, async (req, res) => {
    const { providerId, available_date, start_time, end_time } = req.body;

    if (req.user.role !== 'admin' && req.user.id !== providerId) {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        const availability = await prisma.availability.create({
            data: {
                providerId,
                available_date: new Date(available_date),
                start_time: new Date(start_time),
                end_time: new Date(end_time),
            },
        });
        res.status(201).json(availability);
    } catch (error) {
        res.status(400).json({ error: 'Availability creation failed' });
    }
});

app.put('/availability/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    if (req.user.role !== 'admin' && req.user.id !== providerId) {
        return res.status(403).json({ error: 'Access denied' });
    }

    const { available_date, start_time, end_time } = req.body;

    try {
        const updatedAvailability = await prisma.availability.update({
            where: { id: parseInt(id) },
            data: {
                available_date: new Date(available_date),
                start_time: new Date(start_time),
                end_time: new Date(end_time),
            },
        });
        res.json(updatedAvailability);
    } catch (error) {
        res.status(400).json({ error: 'Update failed' });
    }
});

app.get('/availability/provider/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const availabilitySlots = await prisma.availability.findMany({
            where: { providerId: parseInt(id) },
        });
        res.json(availabilitySlots);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve availability' });
    }
});

app.delete('/availability/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    const availability = await prisma.availability.findUnique({ where: { id: parseInt(id) } });
    if (!availability) {
        return res.status(404).json({ error: 'Availability slot not found' });
    }

    if (req.user.role !== 'admin' && req.user.id !== availability.providerId) {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        await prisma.availability.delete({ where: { id: parseInt(id) } });
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ error: 'Deletion failed' });
    }
});

app.get('/notifications/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: parseInt(id) },
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve notifications' });
    }
});

app.post('/notifications/send', authenticateToken, async (req, res) => {
    const { userId, message } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Notification',
        text: message,
    };

    transporter.sendMail(mailOptions, (error) => {
        if (error) {
            return res.status(500).json({ error: 'Failed to send notification' });
        }

        prisma.notification.create({
            data: {
                userId: user.id,
                message,
            },
        });

        res.status(201).json({ message: 'Notification sent' });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
