// *************** IMPORT LIBRARY ***************
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// *************** IMPORT MODULES  ***************
const UserModel = require('../models/users.js');
const StudentModel = require('../models/students.model');

// *************** GLOBAL VARIABLES ***************
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS);
const JWT_SECRET = process.env.SECRET_KEY;
const DUMMY_HASH = '$2b$10$8.7e/m.e.g.a.l.o.v.a.n.i.a.C.o.m.p.l.e.x.H.a.s.h.1';

/**
 * Registers a new user and creates an associated student record within a transaction.
 *
 * @param {Object} params - The registration parameters.
 * @param {string} params.name - The full name of the user.
 * @param {string} params.email - The email address of the user.
 * @param {string} params.password - The plain text password for the user.
 * @returns {Promise<{newUser: Object, newStudent: Object}>} A promise that resolves to an object containing the created user and student documents.
 * @throws {Error} If the transaction fails or validation errors occur.
 */
async function RegisterUserService({ name, email, password }) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // *************** Normalize inputs to avoid duplicate variants and casing discrepancies
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedName = String(name).trim();

    // *************** Hash password using env-driven cost to balance security and performance
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // *************** Create user with normalized values; rely on unique index to prevent races
    const [newUser] = await UserModel.create(
      [
        {
          name: normalizedName,
          email: normalizedEmail,
          password: hashedPassword,
        },
      ],
      {
        session,
      }
    );

    const [newStudent] = await StudentModel.create(
      [
        {
          user_id: newUser._id,
        },
      ],
      {
        session,
      }
    );

    await session.commitTransaction();

    return {
      newUser,
      newStudent,
    };
  } catch (error) {
    await session.abortTransaction();

    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Authenticates a user by email and password, and returns user data along with an authentication token.
 *
 * @param {Object} params - The login parameters.
 * @param {string} params.email - The email address of the user.
 * @param {string} params.password - The plain text password for the user.
 * @returns {Promise<{user: Object, token: string}>} A promise that resolves to an object containing the user document and a JWT token.
 * @throws {ApiError} If the email or password is incorrect.
 * @throws {Error} If any other error occurs during the login process.
 */
async function LoginUserService({ email, password }) {
  try {
    // *************** Normalize inputs to ensure consistent lookup
    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await UserModel.findOne({ email: normalizedEmail }).select('_id name email password').lean();

    const hashPassword = user ? user.password : DUMMY_HASH;

    // *************** This line now runs safely and takes ~100ms in BOTH cases
    const isPasswordMatch = await bcrypt.compare(password, hashPassword);

    if (!user || !isPasswordMatch) {
      throw new ApiError(401, 'Email or password is wrong.');
    }

    // *************** Generate short-lived token; rotate/refresh strategy can be added later
    const token = jwt.sign({ userId: String(user._id) }, JWT_SECRET, { expiresIn: '1d' });

    return {
      user,
      token,
    };
  } catch (error) {
    throw error;
  }
}

// *************** EXPORT MODULES ***************
module.exports = {
  RegisterUserService,
  LoginUserService,
};
