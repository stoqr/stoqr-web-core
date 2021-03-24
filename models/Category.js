const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    maxlength: 50,
  },
  status: {
    type: String,
    required: true,
    default: 'Aktif',
  },
  createdUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  },
  updatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
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

module.exports = Category = mongoose.model('category', CategorySchema);
