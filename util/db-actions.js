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

  async function updateOnlineTime(userID, onlineTime) {
    const client = await pool.connect();
    try {
      const updateQuery = `
        UPDATE users
        SET online_time = $1
        WHERE publicid = $2`;
      const updateValues = [onlineTime, userID];
      console.log('Executing update query:', updateQuery);
      console.log('Update values:', updateValues);
      await client.query(updateQuery, updateValues);
    } catch (error) {
      console.error('Error updating online time:', error);
    } finally {
      client.release();
    }
  }

  // Get current online time from the database
  async function getOnlineTime(userID) {
    const client = await pool.connect();
    try {
      const selectQuery = `
        SELECT online_time
        FROM users
        WHERE publicid = $1`;
      const selectValues = [userID];
      console.log('Executing select query:', selectQuery);
      console.log('Select values:', selectValues);
      const selectResult = await client.query(selectQuery, selectValues);
      if (selectResult.rows.length > 0) {
        return selectResult.rows[0].online_time || 0;
      } else {
        return 0; // Default to 0 if no record found
      }
    } catch (error) {
      console.error('Error getting online time:', error);
      return 0; // Default to 0 in case of error
    } finally {
      client.release();
    }
  }

  async function addToFavourites(userID, jsonData) {
    const client = await pool.connect();
    try {
      const updateQuery = `
        UPDATE users
        SET favourites = COALESCE(favourites, '[]'::jsonb) || $1::jsonb
        WHERE publicid = $2`;
      const updateValues = [JSON.stringify(jsonData), userID];
      console.log('Executing update query:', updateQuery);
      console.log('Update values:', updateValues);
      const result = await client.query(updateQuery, updateValues);
      if (result.rowCount === 0) {
        console.error('No rows updated, it could be because publicid did not match any records.');
      } else {
        console.log(`Updated ${result.rowCount} rows successfully.`);
      }
    } catch (error) {
      console.error('Error adding to favourites:', error);
    } finally {
      client.release();
    }
  }
  




  async function updateUserData(user) {
    const client = await pool.connect();
    try {
      // Destructure the user object to get necessary properties
      console.log('user data for db:', user);
      const updateQuery = `
        UPDATE users
        SET online_time = $1, level = $2, mana = $3, favourites = $4, name = $5
        WHERE publicid = $6`;
      const updateValues = [user.count, user.level, user.mana, JSON.stringify(user.favourites), user.name, user.ID];
      console.log('Executing update query:', updateQuery);
      console.log('Update values:', updateValues);
      await client.query(updateQuery, updateValues);
    } catch (error) {
      console.error('Error updating user data:', error);
    } finally {
      client.release();
    }
}


  async function getUserData(userID) {
    const client = await pool.connect();
    try {
      const selectQuery = `
        SELECT online_time, level, mana, favourites, name
        FROM users
        WHERE publicid = $1`;
      const selectValues = [userID];
      console.log('Executing select query:', selectQuery);
      console.log('Select values:', selectValues);
      const selectResult = await client.query(selectQuery, selectValues);
      if (selectResult.rows.length > 0) {
        const userData = selectResult.rows[0];
        return {
          publicUserID: userID,
          online_time: userData.online_time || 0,
          level: userData.level || '1',
          mana: userData.mana || 0,
          favourites: userData.favourites || [],
          name: userData.name || '',
        };
      } else {
        return {
          publicUserID: userID,
          online_time: 0,
          level: '1',
          mana: 0,
          favourites: [],
          name: '',
        }; // Default values if no record found
      }
    } catch (error) {
      console.error('Error getting user data:', error);
      return {
        publicUserID: userID,
        online_time: 0,
        level: '1',
        mana: 0,
        favourites: [],
        name: '',
      }; // Default values in case of error
    } finally {
      client.release();
    }
  }
module.exports = { addDummyProfileRow, getPostgresVersion, updateOnlineTime, getOnlineTime, addToFavourites, updateUserData, getUserData };

  
