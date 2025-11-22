// *************** IMPORT LIBRARY ***************
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// *************** IMPORT UTILITIES ***************
const MongooseUtilities = require('./database/mongoose.js');

// *************** IMPORT ROUTES ***************
const UserRoutes = require('./routes/user.route.js');
const InternshipRoutes = require('./routes/internship.route.js');
const StudentRoutes = require('./routes/student.route.js');

// *************** IMPORT MIDDLEWARE ***************
const { AuthMiddleware } = require('./middleware/auth.middleware.js');

const PORT = process.env.PORT || 4000;

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

app.use('/users', UserRoutes);
app.use('/internships', AuthMiddleware, InternshipRoutes);
app.use('/students', AuthMiddleware, StudentRoutes);

const startServer = async () => {
  await MongooseUtilities.ConnectToDatabase();

  app.listen(PORT, () => {
    const base = process.env.SERVER_URL || `http://localhost:${PORT}`;
    console.log(`🚀 Server running at ${base}`);
  });
};

startServer();
