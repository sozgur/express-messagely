/** User class for message.ly */

const db = require("../db");
const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR } = require("../config");
const ExpressError = require("../expressError");

/** User of the site. */

class User {
  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
    const results = await db.query(
      `INSERT INTO users (username, password, first_name, last_name, phone, join_at, last_login_at)
      VALUES ($1, $2, $3, $4, $5, current_timestamp, current_timestamp)
      RETURNING username, password, first_name, last_name, phone`,
      [username, hashedPassword, first_name, last_name, phone]
    );
    return results.rows[0];
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const results = await db.query(
      `SELECT password FROM users WHERE username = $1`,
      [username]
    );

    const user = results.rows[0];

    return user && (await bcrypt.compare(password, user.password));
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const results = await db.query(
      `
      UPDATE users SET last_login_at = current_timestamp
      WHERE username = $1
      RETURNING username`,
      [username]
    );

    if (!results.rows[0]) {
      throw new ExpressError(`Not found user: ${username}`, 404);
    }
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    const results = await db.query(`
      SELECT username, first_name, last_name, phone
      FROM users;`);

    return results.rows;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const results = await db.query(
      `
      SELECT username, first_name, last_name, phone, join_at, last_login_at
      FROM users
      WHERE username = $1`,
      [username]
    );
    if (!results.rows[0]) {
      throw new ExpressError(`Not found user: ${username}`, 404);
    }
    return results.rows[0];
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    const results = await db.query(
      `
      SELECT m.id, m.body, m.sent_at, m.read_at,
      u.username, u.first_name, u.last_name, u.phone
      FROM messages AS m
      JOIN users AS u
      ON m.to_username = u.username
      WHERE m.from_username = $1`,
      [username]
    );

    const users = results.rows.map((r) => {
      return {
        id: r.id,
        to_user: {
          username: r.username,
          first_name: r.first_name,
          last_name: r.last_name,
          phone: r.phone,
        },
        body: r.body,
        sent_at: r.sent_at,
        read_at: r.read_at,
      };
    });

    return users;
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const results = await db.query(
      `
      SELECT m.id, m.body, m.sent_at, m.read_at,
      u.username, u.first_name, u.last_name, u.phone
      FROM messages AS m
      JOIN users AS u
      ON m.from_username = u.username
      WHERE m.to_username = $1`,
      [username]
    );

    const users = results.rows.map((r) => {
      return {
        id: r.id,
        from_user: {
          username: r.username,
          first_name: r.first_name,
          last_name: r.last_name,
          phone: r.phone,
        },
        body: r.body,
        sent_at: r.sent_at,
        read_at: r.read_at,
      };
    });

    return users;
  }
}

module.exports = User;
