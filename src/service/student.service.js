// *************** IMPORT MODULES ***************
const StudentModel = require('../models/students.model');

async function GetStudentProfileService(studentId) {
  // *************** Find student profile by ID
  const studentProfile = await StudentModel.findById(studentId)
    .select('major desired_roles skills interests preferred_industries preferred_locations work_modes education_level')
    .lean();

  // *************** Return student profile
  return studentProfile;
}

// *************** EXPORT MODULES ***************
module.exports = {
  GetStudentProfileService,
};
