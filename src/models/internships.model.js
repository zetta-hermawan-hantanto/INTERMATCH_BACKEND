// *************** IMPORT CORE ***************
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const internshipSchema = new Schema(
  {
    // Status of the internship: can be 'active' or 'deleted'
    status: {
      type: String,
      enum: ['active', 'deleted'],
      default: 'active',
    },

    // Title of the internship position (required)
    title: {
      type: String,
      required: true,
    },

    // Role or job function for the internship (required)
    role: {
      type: String,
      required: true,
    },

    // Reference to the associated company (required, ObjectId ref 'companies')
    company: {
      type: Schema.ObjectId,
      required: true,
      ref: 'companies',
    },

    // Program or office location (required)
    location_program: {
      type: String,
      required: true,
    },

    // Specifies whether the internship is onsite, remote, or hybrid
    work_mode: {
      type: String,
      enum: ['onsite', 'remote', 'hybrid'],
    },

    // Array of benefit descriptions (e.g., health insurance, free lunch)
    benefits: [
      {
        type: String,
      },
    ],

    // Salary information: min/max/currency (all optional)
    salary: {
      // Minimum salary offered
      min: { type: Number },
      // Maximum salary offered
      max: { type: Number },
      // Currency code, e.g., 'USD'
      currency: { type: String },
    },

    // Array of requirement descriptions (skills, experiences, etc.)
    requirements: [
      {
        type: String,
      },
    ],

    // Internship description (optional)
    description: {
      type: String,
    },

    // Array listing the responsibilities of the intern
    responsibilities: [
      {
        type: String,
      },
    ],

    // Accepted education levels (e.g., Bachelor's, Master's)
    education_levels: [
      {
        type: String,
      },
    ],

    // Skills required or recommended
    skills: [
      {
        type: String,
      },
    ],

    // Duration detail: Number of time units and unit type (e.g. 6 months)
    duration: {
      // Value of period (e.g. 6)
      value: { type: Number },
      // Unit type (e.g. 'months', 'weeks')
      unit: { type: String },
    },

    // Original job post source (platform, URL, date posted)
    source: {
      // e.g. 'LinkedIn', 'JobStreet'
      platform: { type: String },
      // Source URL
      url: { type: String },
      // Original post date
      posted_at: { type: Date },
      // External ID from source platform
      external_id: { type: String },
    },

    // Languages required or preferred (e.g., 'English', 'Spanish')
    languages: [
      {
        type: String,
      },
    ],

    // Tags for categorization/searching (e.g., 'marketing', 'remote')
    tags: [
      {
        type: String,
      },
    ],

    //  Current vector embedding for this internship
    vector: {
      index: { type: String },
      value: {
        type: Map,
        of: Number,
      },
    },

    // Historical vector embeddings for this internship (for updates/evolution)
    vector_histories: [
      {
        status: { type: String, enum: ['active', 'inactive'], default: 'active' },
        vector: {
          index: { type: String },
          value: {
            type: Map,
            of: Number,
          },
        },
        created_at: { type: Date, default: Date.now },
      },
    ],
  },
  {
    // Enable createdAt and updatedAt timestamps automatically
    timestamps: true,
  }
);

// *************** EXPORT MODULES ***************
module.exports = mongoose.model('internships', internshipSchema);
