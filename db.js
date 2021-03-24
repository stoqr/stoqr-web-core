const mongoose = require('mongoose');
const config = require('config');
const db = config.get('AtlasDBURI');

const connectDB = async () => {
  try {
    await mongoose.connect(db, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    });
    console.log('Connected to Database');
  } catch (error) {
    console.log('Error while connecting to Database: ' + error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
