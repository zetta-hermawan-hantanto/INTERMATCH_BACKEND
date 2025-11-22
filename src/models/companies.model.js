// *************** IMPORT CORE ***************
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const companySchema = new Schema(
  {
    // Status of the company: can be 'active' or 'deleted'
    status: {
      type: String,
      enum: ['active', 'deleted'],
      default: 'active',
    },

    // The name of the company (required)
    name: { type: String, required: true },

    // The location or headquarters of the company (required)
    main_location: { type: String, required: true },

    // The industry or field in which the company operates (required)
    industry_field: { type: String, required: true },

    // The company size, represented by minimum and maximum number of employees
    company_size: {
      // Minimum number of employees in the company
      min_employee: {
        type: Number,
      },
      // Maximum number of employees in the company
      max_employee: {
        type: Number,
      },
    },

    // Brief description of the company (optional)
    description: { type: String },

    // A unique key to identify the company (e.g., could be a slug or unique ID)
    unique_key: { type: String, unique: true, index: true },
  },
  {
    // Enable createdAt and updatedAt timestamps
    timestamps: true,
  }
);

// *************** EXPORT MODULES ***************
module.exports = mongoose.model('companies', companySchema);
