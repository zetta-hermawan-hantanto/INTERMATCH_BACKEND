// *************** IMPORT CORE ***************
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    // Status of the user: can be 'active' or 'deleted'
    status: {
      type: String,
      enum: ['active', 'deleted'],
      default: 'active',
    },

    // User's full name (required, trimmed for spaces)
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // User's unique email address (required, unique, indexed, stored lowercase and trimmed)
    email: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      index: true,
      lowercase: true,
    },

    // User's hashed password (required)
    password: {
      type: String,
      required: true,
    },
  },
  {
    // Enable createdAt and updatedAt timestamps automatically
    timestamps: true,
  }
);

// *************** EXPORT MODULES ***************
module.exports = mongoose.model('users', userSchema);
