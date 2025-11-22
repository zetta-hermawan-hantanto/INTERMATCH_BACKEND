// *************** IMPORT CORE ***************
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VectorMetaSchema = new Schema(
  {
    // Status of the internship: can be 'active' or 'deleted'
    status: {
      type: String,
      enum: ['active', 'deleted'],
      default: 'active',
    },

    // Name of the vector metadata entry
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    // Corresponding IDF values for the vocabulary terms
    idf_values: { type: Map, of: Number },
  },
  {
    // Enable createdAt and updatedAt timestamps automatically
    timestamps: true,
  }
);

// *************** EXPORT MODULES ***************
module.exports = mongoose.model('vector_meta', VectorMetaSchema);
