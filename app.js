const express = require('express'); //framework for utilizing http functions of nodejs
const app = express(); //initilazing the app over express fw
const connectDB = require('./db');
const path = require('path');
//connection to DB
connectDB();

//route definitions
const authRoutes = require('./routes/api/v1/auth');
const userRoutes = require('./routes/api/v1/user');
const stockRoutes = require('./routes/api/v1/stock');
const movementRoutes = require('./routes/api/v1/movement');
const categoryRoutes = require('./routes/api/v1/category');
const locationRoutes = require('./routes/api/v1/location');
//MW
app.use(express.json({ extended: false }));

//routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/stocks', stockRoutes);
app.use('/api/v1/movements', movementRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/locations', locationRoutes);

//serve static assets in prod
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('../frontend/build'));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'frontend', 'build', 'index.html'));
  });
}

module.exports = app;
