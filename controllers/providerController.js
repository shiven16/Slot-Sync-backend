const bcrypt = require('bcrypt');
const prisma = require('../prisma/client'); // adjust path as necessary

const createProvider = async (req, res) => {
    const { username, email, password, service_type, location, contact_number, availability } = req.body;

    try {
        // Check if a provider with the given email already exists
        const existingProvider = await prisma.ServiceProvider.findUnique({
            where: { email },
        });

        if (existingProvider) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        // Generate password hash
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create the new provider with availability
        const newProvider = await prisma.ServiceProvider.create({
            data: {
                username,
                email,
                password_hash: passwordHash,
                service_type,
                location,
                contact_number,
                availability: {
                    create: availability.map((slot) => ({
                        start_time: slot.start_time,
                        end_time: slot.end_time,
                        available_date: new Date(slot.available_date),
                    })),
                },
            },
        });

        // Respond with the created provider details
        res.status(201).json({
            message: 'Provider created successfully',
            provider: {
                id: newProvider.id,
                username: newProvider.username,
                email: newProvider.email,
                service_type: newProvider.service_type,
                location: newProvider.location,
                contact_number: newProvider.contact_number,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during provider creation' });
    }
};

module.exports = createProvider;



const getProviderById = async (req, res) => {
    const { id } = req.params;
    try {
        const provider = await prisma.ServiceProvider.findUnique({ where: { id: parseInt(id) } });
        if (!provider) return res.status(404).json({ error: 'Provider not found' });
        res.json(provider);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

const updateProvider = async (req, res) => {
    const providerId = req.params.id;
    const { username, email, password, service_type, location, contact_number, availability } = req.body;

    try {
        // Find the provider by ID
        const existingProvider = await prisma.ServiceProvider.findUnique({
            where: { id: parseInt(providerId) },
        });

        if (!existingProvider) {
            return res.status(404).json({ error: 'Provider not found' });
        }

        // Check if the email is being changed and if the new email is already in use
        if (email && email !== existingProvider.email) {
            const emailInUse = await prisma.ServiceProvider.findUnique({ where: { email } });
            if (emailInUse) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }

        // Hash the new password if provided
        let passwordHash;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            passwordHash = await bcrypt.hash(password, salt);
        }

        // Update provider details, excluding `availability` for now
        const updatedProvider = await prisma.ServiceProvider.update({
            where: { id: parseInt(providerId) },
            data: {
                username: username || existingProvider.username,
                email: email || existingProvider.email,
                password_hash: passwordHash || existingProvider.password_hash,
                service_type: service_type || existingProvider.service_type,
                location: location || existingProvider.location,
                contact_number: contact_number || existingProvider.contact_number,
            },
        });

        // If availability is provided, delete existing slots and create new ones
        if (availability) {
            // Delete existing availability for the provider
            await prisma.Availability.deleteMany({
                where: { providerId: parseInt(providerId) },
            });

            // Create new availability slots
            await prisma.Availability.createMany({
                data: availability.map((slot) => ({
                    providerId: parseInt(providerId),
                    start_time: new Date(slot.start_time),
                    end_time: new Date(slot.end_time),
                    available_date: new Date(slot.available_date),
                })),
            });
        }

        // Send response with the updated provider details
        res.status(200).json({
            message: 'Provider updated successfully',
            provider: {
                id: updatedProvider.id,
                username: updatedProvider.username,
                email: updatedProvider.email,
                service_type: updatedProvider.service_type,
                location: updatedProvider.location,
                contact_number: updatedProvider.contact_number,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during provider update' });
    }
};

module.exports = updateProvider;

const getProviderAvailability = async (req, res) => {
    const providerId = parseInt(req.params.id, 10);

    try {
        if (isNaN(providerId)) {
            return res.status(400).json({ error: 'Invalid provider ID' });
        }

        const provider = await prisma.ServiceProvider.findUnique({
            where: { id: providerId },
            include: { availability: true },
        });

        if (!provider) {
            return res.status(404).json({ error: 'Provider not found' });
        }

        res.status(200).json({
            message: 'Provider availability retrieved successfully',
            availability: provider.availability,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error while retrieving provider availability' });
    }
};



module.exports = { createProvider, getProviderById, updateProvider, getProviderAvailability };
