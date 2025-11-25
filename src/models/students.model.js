const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const studentSchema = new Schema(
  {
    // Status of the student: can be 'active' or 'deleted'
    status: {
      type: String,
      enum: ['active', 'deleted'],
      default: 'active',
    },

    // Major or field of study of the student (required)
    major: {
      type: String,
    },

    // Desired roles for internships
    desired_roles: [
      {
        type: String,
      },
    ],

    // Areas of interest for internships
    interests: [
      {
        type: String,
      },
    ],

    // Preferred industries for internships
    preferred_industries: [
      {
        type: String,
      },
    ],

    // Preferred locations for internships
    preferred_locations: [
      {
        type: String,
      },
    ],

    // Skills possessed by the student
    skills: [
      {
        type: String,
      },
    ],

    // Preferred work modes: onsite, remote, hybrid
    preferred_work_modes: [
      {
        type: String,
        enum: ['onsite', 'remote', 'hybrid'],
      },
    ],

    // Education level of the student
    education_level: {
      type: String,
    },

    // Reference to the associated user (required, ObjectId ref 'users')
    user_id: {
      type: Schema.ObjectId,
      required: true,
      ref: 'users',
    },

    // Reference to the liked internships (ObjectId ref 'internships')
    liked_internships: [
      {
        type: Schema.ObjectId,
        ref: 'internships',
      },
    ],
  },
  {
    // Enable createdAt and updatedAt timestamps automatically
    timestamps: true,
  }
);

// *************** EXPORT MODULES ***************
module.exports = mongoose.model('students', studentSchema);
