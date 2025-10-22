const db = require('../db');

/**
 * Finds all users with pagination and search.
 * @param {object} options - Options for querying users.
 * @param {number} options.limit - The number of users per page.
 * @param {number} options.offset - The starting offset for pagination.
 * @param {string} options.searchQuery - The search term.
 * @returns {Promise<{rows: Array, totalUsers: number}>}
 */
const findAll = async ({ limit, offset, searchQuery }) => {
  const queryParams = [];
  let whereClause = '';

  if (searchQuery) {
    const sanitizedSearch = searchQuery.replace(/[%_]/g, '\\$&');
    queryParams.push(`%${sanitizedSearch}%`);
    whereClause = `WHERE (first_name ILIKE $${queryParams.length} OR last_name ILIKE $${queryParams.length} OR email ILIKE $${queryParams.length})`;
  }

  const usersQuery = `
    SELECT id, email, first_name, last_name, role, is_active, country_of_origin, created_at, updated_at, last_login_at
    FROM users
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
  `;

  const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;

  const usersResult = await db.query(usersQuery, [...queryParams, limit, offset]);
  const countResult = await db.query(countQuery, queryParams);
  const totalUsers = parseInt(countResult.rows[0].count, 10);

  return { rows: usersResult.rows, totalUsers };
};

/**
 * Finds a user by their ID.
 * @param {number} id - The user's ID.
 * @returns {Promise<object|null>} The user object or null if not found.
 */
const findById = async (id) => {
  const { rows } = await db.query(
    `SELECT id, email, first_name, last_name, role, is_active, country_of_origin,
            profile_picture_url, linkedin_profile_url, twitter_profile_url, created_at
     FROM users WHERE id = $1`,
    [id]
  );
  return rows[0];
};

/**
 * Updates a user by their ID.
 * @param {number} id - The user's ID.
 * @param {object} data - The data to update.
 * @returns {Promise<object|null>} The updated user object or null if not found.
 */
const updateById = async (id, data) => {
  const { rows } = await db.query(
    `UPDATE users SET
       first_name = COALESCE($1, first_name),
       last_name = COALESCE($2, last_name),
       country_of_origin = COALESCE($3, country_of_origin),
       linkedin_profile_url = COALESCE($4, linkedin_profile_url),
       twitter_profile_url = COALESCE($5, twitter_profile_url),
       role = COALESCE($6, role),
       is_active = COALESCE($7, is_active)
     WHERE id = $8
     RETURNING id, email, first_name, last_name, role, is_active, country_of_origin, linkedin_profile_url, twitter_profile_url`,
    [data.firstName, data.lastName, data.countryOfOrigin, data.linkedin_profile_url, data.twitter_profile_url, data.role, data.is_active, id]
  );
  return rows[0];
};

/**
 * Performs a bulk update on users.
 * @param {Array<number>} userIds - Array of user IDs to update.
 * @returns {Promise<number>} The number of rows affected.
 */
const bulkDeactivate = async (userIds) => {
  const { rowCount } = await db.query(
    'UPDATE users SET is_active = false WHERE id = ANY($1::int[])',
    [userIds]
  );
  return rowCount;
};

module.exports = {
  findAll,
  findById,
  updateById,
  bulkDeactivate,
};
