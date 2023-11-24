require("dotenv").config();

const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";
const connectionString_backup = `postgresql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
    connectionString: isProduction ? process.env.DATABASE_URL : connectionString,
    ssl: isProduction ? { rejectUnauthorized: false } : { rejectUnauthorized: false, sslmode: 'require' },
});



module.exports = { pool };
