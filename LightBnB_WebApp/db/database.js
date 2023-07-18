const properties = require("./json/properties.json");
const users = require("./json/users.json");
const { Pool } = require('pg');

//connect to our database
const pool = new Pool({
  user: 'labber',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

// the following assumes that you named your connection variable `pool`
pool.query(`SELECT title FROM properties LIMIT 10;`)

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
   return pool.query('SELECT * FROM users WHERE email = $1;', [email])
  .then((response) => {
    const user = response.rows[0];  // undefined || user object
    return user;
  })
  .catch((err) => {
    console.log(err.message);
  });
};


/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool.query('SELECT * FROM users WHERE id = $1;', [id])
  .then((response) => {
    const user = response.rows[0];  // undefined || user object
    return user;
  })
  .catch((err) => {
    console.log(err.message);
  });
};
    
/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  
  const queryString = `
  INSERT INTO users (name, email, password)
  VALUES ($1, $2, $3)
  RETURNING *;
  `;

return pool
  .query(queryString, [user.name, user.email, user.password]) // Accepts a user object that will have a name, email, and password property
  .then((result) => {
    return result.rows[0];
  })
  .catch((err) => {
    console.log(err.message);
  });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  return pool.query(`
  SELECT reservations.*, properties.*, users.*
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id    
  JOIN users ON reservations.guest_id = users.id
  WHERE reservations.guest_id = $1
  LIMIT $2;
`, [guest_id, limit])
  .then((response) => {   
    const reservations = response.rows; // Array of reservation objects
    return reservations;
  })
  .catch((err) => {
    console.log(err.message);
  });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options, limit = 10) {

  //An array to hold any parameters that may be available for the query
  const queryParams = [];             

  // All information that comes before the WHERE clause
  let queryString = `      
    SELECT properties.*, AVG(property_reviews.rating) AS average_rating
    FROM properties
    JOIN property_reviews ON properties.id = property_id
  `;

  // Filter by owner_id
  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryString += `WHERE owner_id = $${queryParams.length}::text `;
  }

  // Filter by price range
  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100, options.maximum_price_per_night * 100);
    queryString += `${queryParams.length === 1 ? 'WHERE' : 'AND'} cost_per_night BETWEEN $${queryParams.length - 1} AND $${queryParams.length} `;
  }

  // Filter by minimum_rating
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += `${queryParams.length === 1 ? 'WHERE' : 'AND'} property_reviews.rating >= $${queryParams.length} `;
  }

  //Any query that comes after the WHERE clause
  queryParams.push(limit);
  queryString += `
    GROUP BY properties.id
    ORDER BY cost_per_night
    LIMIT $${queryParams.length}::integer;
  `;

  console.log(queryString, queryParams);

  return pool.query(queryString, queryParams)
    .then((res) => res.rows);
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
