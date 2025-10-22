const bcrypt = require('bcrypt');
const db = require('../config/db');
const AppError = require('../utils/AppError');
exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const userExists = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userExists.rows.length > 0) throw new AppError('Email already in use.', 409);
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await db.query(
      'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, email',
      [email.toLowerCase(), hashedPassword, firstName, lastName]
    );
    res.status(201).json({ message: 'User registered.', user: result.rows[0] });
  } catch (error) { next(error); }
};
exports.login = async (req, res, next) => {
  try { res.status(200).json({ message: 'Login placeholder' }); }
  catch (error) { next(error); }
};
