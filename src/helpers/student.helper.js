/**
 * Builds a concatenated string of relevant text fields from a student profile.
 * This string can be used for search indexing or other text-based operations.
 *
 * @param {object} studentProfile - The student profile object containing various details.
 * @param {string} studentProfile.major - The student's major.
 * @param {string[]} studentProfile.desired_roles - An array of desired job roles.
 * @param {string[]} studentProfile.interests - An array of student interests.
 * @param {string[]} studentProfile.preferred_industries - An array of preferred industries.
 * @param {string} studentProfile.education_level - The student's education level.
 * @param {string[]} studentProfile.skills - An array of student skills.
 * @returns {string} A space-separated, lowercase string of filtered and cleaned student profile text.
 * @throws {Error} If the studentProfile is invalid or not an object.
 */
function BuildDocumentTextStudentProfile(studentProfile) {
  try {
    // *************** Validate the input studentProfile
    if (!studentProfile || typeof studentProfile !== 'object') {
      throw new Error('Invalid student profile: studentProfile must be a non-null object.');
    }

    // *************** Destructure relevant fields from the student profile for easier access
    const {
      major,
      desired_roles: desiredRoles,
      interests,
      preferred_industries: preferredIndustries,
      education_level: educationLevel,
      skills,
    } = studentProfile;

    // *************** Combine all text fields into a single array, flattening arrays where necessary
    const listFields = [major, ...desiredRoles, ...interests, ...preferredIndustries, educationLevel, ...skills];

    // *************** Process the combined list of fields to create a clean document text
    const documentText = listFields
      .filter(Boolean) // *************** Remove any null, undefined, or empty string values
      .map((sentence) => sentence.replace(/\s+/g, ' ').trim()) // *************** Normalize whitespace and trim each string
      .filter(Boolean) // *************** Remove any strings that became empty after trimming
      .join(' ') // *************** Join all valid strings into a single space-separated string
      .toLowerCase(); // *************** Convert the entire string to lowercase for case-insensitive matching

    return documentText;
  } catch (error) {
    // *************** Log and rethrow any errors encountered during processing
    console.log(error.stack);

    // *************** Rethrow the error to be handled by the caller
    throw error;
  }
}

// *************** EXPORT MODULES ***************
module.exports = {
  BuildDocumentTextStudentProfile,
};
