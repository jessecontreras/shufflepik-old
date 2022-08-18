const MongoClient = require("mongodb").MongoClient;

class Connection {
  /**
   * Connect to MongoClient.
   *
   * @returns {Promise<object>} MongoClient db object.
   */
  static async open() {
    if (this.db) return this.db;
    this.db = await MongoClient.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    this.db = this.db.db(process.env.SHUFFLEPIK_DB);
    return this.db;
  }
  /**
   * Close connection to MongoClient.
   *
   * @returns {Promise<void>}
   */
  static async close() {
    if (this.db) this.db.close();
    return;
  }
}

Connection.db = null;

module.exports = { Connection };
/*module.exports = (async (uri = process.env.MONGO_URI, options = {}) => {
  console.log(`Does a mongo process exist already? : ${process.mongoDb}`);
  console.log(process.mongoDb);

  if (!process.mongoDb) {
    const mongoDb = await MongoClient.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: process.env.NODE_ENV === "production",
      ...options,
    });
    const db = mongo.db(process.env.SHUFFLEPIK_DB);
    process.mongoDb = db;
    return {
      db,
      Collection: db.collection.bind(db),
      connection: mongoDb,
    };
  }
  return null;
})();*/

/*async function open() {
  try {
    console.log("Finna connect mongo");
    console.log("Is there a db connection?");
    console.log(process.db);
    if (process.db) return process.db;
    const client = new MongoClient(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });*/
/* const db = await MongoClient.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });*/
//const connection = await client.connect();
//await client.connect();
//const db = connection.db(process.env.SHUFFLEPIK_DB);
/*const db = client.db(process.env.SHUFFLEPIK_DB);
    // const db = connection.db(process.env.SHUFFLEPIK_DB);
    process.db = db;
    console.log("db");
    console.log(db);
    console.log("Process db");
    console.log(process.db);
    return db;
  } catch (err) {
    console.log(err);
    throw err;
  }
}*/

/**
 * Closes MongoDB connection.
 * @returns {Promise<void>}
 */
/*async function close() {
  try {
    if (process.db) process.db.close();
    return;
  } catch (err) {
    console.log(err);
    throw err;
  }
}*/

/**
 * MongoDB connection instance.
 * @returns {Promise<any>} MongoDB connection instance.
 */
/*async function db() {
  try {
    console.log("return db");
    console.log(process.db);
    return process.db;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

let mongo = {};
mongo.open = open;
mongo.close = close;
mongo.db = db;

module.exports = mongo;*/
//const connectToMongoDb = async (uri = uri, options = {}) => {
/*const connectToMongoDb = async (uri = process.env.MONGO_URI, options = {}) => {
  console.log(`Does a mongo process exist already? : ${process.mongoDb}`);
  console.log(process.mongoDb);
  if (!process.mongoDb) {
    console.log("here 1");
    const mongoDb = await MongoClient.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }); /*,
      ssl: process.env.NODE_ENV === "production",
      ...options,,
    });
    const mongoDb = await client.connect();*/
//const mongoDb = await mongoClient.connect();
/*const mongoDb = await client.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: process.env.NODE_ENV === "production",
      ...options,
    });*
    console.log("here 2");
    const db = mongoDb.db(process.env.SHUFFLEPIK_DB);
    console.log("here 3");
    process.mongoDb = db;
    return {
      db,
      Collection: db.collection.bind(db),
      connection: db.s.client,
    };
  }
  //return null;
  db = process.mongoDb;
  return {
    db,
    Collection: db.collection.bind(db),
    connection: db.s.client,
  };
};

//Module object
let mongo = {};
//Assign module object properties
mongo.connectToMongoDb = connectToMongoDb; //connectToMongoDb(process.env.MONGO_URI, {});
module.exports = mongo;

//export default await connectToMongoDb(process.env.MONGO_URI, {});*/
/*Object.defineProperty(exports, "__esModule", {
  value: true,
});*/

/*const connectToMongoDb = async (uri = uri, options = {}) => {
  console.log(`Does a mongo process exist already? : ${process.mongoDb}`);
  console.log(process.mongoDb);

  if (!process.mongoDb) {
    const mongoDb = await MongoClient.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: process.env.NODE_ENV === "production",
      ...options,
    });
    const db = mongo.db(process.env.SHUFFLEPIK_DB);
    process.mongoDb = db;
    return {
      db,
      Collection: db.collection.bind(db),
      connection: mongoDb,
    };
  }

  return null;
};
*/
//var _default = await connectToMongoDb(process.env.MONGO_URI, {});

//exports.default = _default;
