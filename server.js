const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const providerRoutes = require('./routes/providerRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;
console.log(PORT)

app.use(cors());
app.use(bodyParser.json());

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/providers', providerRoutes);
app.use('/bookings', bookingRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
