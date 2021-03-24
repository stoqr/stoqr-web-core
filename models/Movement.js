const mongoose = require('mongoose');

const MovementSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    maxlength: 50,
  },
  stockChange: {
    type: Number,
    required: true,
  },
  stockCount: {
    type: Number,
    required: true,
  },
  criticalityStatus: {
    type: String,
    required: true,
  },
  stock: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'stock',
    required: true,
  },
  createdUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  createdDate: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

module.exports = Movement = mongoose.model('movement', MovementSchema);
