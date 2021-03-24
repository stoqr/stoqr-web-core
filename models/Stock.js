const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    maxlength: 10,
  },
  name: {
    type: String,
    required: true,
    maxlength: 100,
  },
  status: {
    type: String,
    required: true,
    default: 'Aktif',
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'category',
    required: true,
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'location',
    required: true,
  },
  criticalityLevel: {
    type: Number,
    required: true,
    min: 0,
  },
  criticalityStatus: {
    type: String,
    required: true,
  },
  stockCount: {
    type: Number,
    required: true,
    min: 0,
  },
  buyingPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  qrCode: {
    type: String,
    required: true,
  },
  createdUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  updatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
  updatedDate: {
    type: Date,
    default: Date.now,
  },
});

module.exports = Stock = mongoose.model('stock', StockSchema);
