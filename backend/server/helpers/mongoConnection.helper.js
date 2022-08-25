const MongoClient = require("mongodb").MongoClient;

class Connection {
  /**
   * Connect to MongoClient.
   *
   * @returns {Promise<object>} MongoClient db object.
   */
  static async open() {
    try {
      if (this.db) return this.db;
      this.db = await MongoClient.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      this.db = this.db.db(process.env.SHUFFLEPIK_DB);
      return this.db;
    } catch (err) {
      console.log(err);
      throw err;
    } finally {
      await this.db.close();
    }
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
