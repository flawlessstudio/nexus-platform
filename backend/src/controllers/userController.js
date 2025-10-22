const logger = require('../utils/logger');
const userModel = require('../models/userModel');

/**
 * Retrieves all users from the database for administrative purposes.
 * This function is intended to be used in admin-only routes.
 * It explicitly excludes the user's password hash from the result set for security.
 *
 * @param {object} req - Express request object. The user performing the action is available at req.user.
 * @param {object} res - Express response object.
 */
const getAllUsers = async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = (page - 1) * limit;
  const searchQuery = req.query.search || '';

  try {
    const { rows, totalUsers } = await userModel.findAll({ limit, offset, searchQuery });

    res.status(200).json({
      users: rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        limit,
      },
    });
  } catch (error) {
    logger.error('Error fetching all users:', error);
    next(error);
  }
};

/**
 * Updates a user's details (role, is_active).
 * Intended for admin use only.
 */
const updateUser = async (req, res, next) => {
  const { id } = req.params;
  const { role, is_active } = req.body;

  // Prevent an admin from deactivating themselves
  if (req.user.id === parseInt(id, 10) && is_active === false) {
    return res.status(400).json({ message: 'Admins cannot deactivate their own account.' });
  }

  // Prevent an admin from changing their own role (IDOR)
  if (req.user.id === parseInt(id, 10) && role) {
    return res.status(400).json({ message: 'Admins cannot change their own role.' });
  }

  try {
    const updatedUser = await userModel.updateById(id, { role, is_active });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    logger.error(`Error updating user ${id}:`, error);
    next(error);
  }
};

/**
 * Performs bulk actions on a list of users.
 * Currently supports deactivation.
 */
const bulkUpdateUsers = async (req, res, next) => {
  const { userIds, action } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0 || !action) {
    return res.status(400).json({ message: 'Invalid request. "userIds" array and "action" are required.' });
  }

  // Filter out the admin's own ID to prevent self-deactivation
  const filteredUserIds = userIds.filter(id => id !== req.user.id);

  if (filteredUserIds.length === 0) {
    return res.status(400).json({ message: 'No valid users to update. Admins cannot update themselves in bulk.' });
  }

  try {
    if (action === 'deactivate') {
      const rowCount = await userModel.bulkDeactivate(filteredUserIds);
      res.status(200).json({ message: `Successfully deactivated ${rowCount} user(s).` });
    } else {
      res.status(400).json({ message: `Action "${action}" is not supported.` });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves the profile of the currently authenticated user.
 */
const getMe = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * Allows a logged-in user to update their own profile information.
 */
const updateMyProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, countryOfOrigin, linkedin_profile_url, twitter_profile_url } = req.body;
    const userId = req.user.id;

    const updatedUser = await userModel.updateById(userId, { firstName, lastName, countryOfOrigin, linkedin_profile_url, twitter_profile_url });

    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  updateUser,
  bulkUpdateUsers,
  getMe,
  updateMyProfile,
};
