const { pool } = require('./dbConfig');


async function addDummyProfileRow() {
    const client = await pool.connect();
    try {
      // Define the dummy data
      const dummyData = {
        username: 'dummyUser',
        email: 'dummy@example.com',
        password: 'dummyPassword',
        online_time: 3600,
        homeworld: 'Earth',
        is_afk: false,
      };
  
      // Insert the data into the "profile" table
      const query = `
        INSERT INTO profile (username, email, password, online_time, homeworld, is_afk)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`;
      
      const values = [
        dummyData.username,
        dummyData.email,
        dummyData.password,
        dummyData.online_time,
        dummyData.homeworld,
        dummyData.is_afk,
      ];
  
      const result = await client.query(query, values);
      
      // The ID of the newly inserted row
      const newProfileId = result.rows[0].id;
      
      console.log(`Inserted row with ID: ${newProfileId}`);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      client.release();
    }
  }

  async function getPostgresVersion() {
    const client = await pool.connect();
    try {
      const response = await client.query('SELECT version()');
      console.log(response.rows[0]);
    } finally {
      client.release();
    }
  }

  async function updateOnlineTime(intervalID, profileID) {
    const client = await pool.connect();
    try {
      // Get the current online_time value
      const selectQuery = `
        SELECT online_time
        FROM users
        WHERE id = $1`;
      const selectValues = [profileID];
      const selectResult = await client.query(selectQuery, selectValues);
      const currentOnlineTime = selectResult.rows[0].online_time;

      // Calculate the new online_time value
      const newOnlineTime = currentOnlineTime + intervalID;

      // Update the online_time value in the database
      const updateQuery = `
        UPDATE users
        SET online_time = $1
        WHERE id = $2`;
      const updateValues = [newOnlineTime, profileID];
      await client.query(updateQuery, updateValues);

      console.log(`Updated online_time for profile ${profileID} to ${newOnlineTime}`);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      client.release();
    }
  }


  
  async function getOnlineTime(profileID) {
    const client = await pool.connect();
    try {
      // Get the current online_time value
      const selectQuery = `
        SELECT online_time
        FROM users
        WHERE id = $1`;
      const selectValues = [profileID];
      const selectResult = await client.query(selectQuery, selectValues);
      const currentOnlineTime = selectResult.rows[0].online_time;

      return currentOnlineTime;
    } catch (error) {
      console.error('Error:', error);
    } finally {
      client.release();
    }
  }

  

  module.exports = { addDummyProfileRow, getPostgresVersion, updateOnlineTime, getOnlineTime };