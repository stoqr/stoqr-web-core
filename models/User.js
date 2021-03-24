const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    default: 'Aktif',
  },
  role: {
    type: String,
    required: true,
    default: 'Kullanıcı',
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

module.exports = User = mongoose.model('user', UserSchema);
