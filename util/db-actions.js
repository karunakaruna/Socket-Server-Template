
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

  module.exports = {addDummyProfileRow};