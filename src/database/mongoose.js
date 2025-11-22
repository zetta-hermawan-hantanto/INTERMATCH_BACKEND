// *************** IMPORT CORE ***************
const mongoose = require('mongoose');

// *************** GLOBAL VARIABLES ***************
let connection;

/**
 * Connects to the MongoDB database using Mongoose.
 * Ensures a single connection is maintained across the application.
 *
 * @async
 * @function ConnectToDatabase
 * @returns {Promise<void>} Resolves when the connection is established.
 * @throws {Error} Logs error if connection fails.
 */
const ConnectToDatabase = async () => {
  try {
    if (!connection) {
      connection = await mongoose.connect(process.env.MONGO_URI);
    }

    console.log('Connected to the database.');
  } catch (error) {
    console.log(error.stack);
    throw error;
  }
};

// *************** EXPORT MODULES ***************
module.exports = {
  ConnectToDatabase,
};
