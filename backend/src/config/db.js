const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.NODE_ENV === 'test' ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL,
});
module.exports = { pool, query: (text, params) => pool.query(text, params) };
