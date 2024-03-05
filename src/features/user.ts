import Database, { Statement } from "bun:sqlite";
import path from "node:path";
import { markError } from "../common/err";
import { BunPkgConfig } from "../config.final";

const database = path.join(BunPkgConfig.cache.dir, `user.sqlite`);

const SQL = {
  WAL: `PRAGMA journal_mode = WAL;`,
  /** 创建表 */
  CREATE: `
    CREATE TABLE IF NOT EXISTS user (
      name TEXT PRIMARY KEY,
      pwd TEXT
    )`,
  /** 创建表 */
  INDEXS: `CREATE UNIQUE INDEX IF NOT EXISTS name ON user (name)`,
  Query: `SELECT * FROM user WHERE name = $name`,
  Upsert: `INSERT OR REPLACE INTO user (name, pwd) VALUES ($name, $pwd)`,
  Remove: `DELETE FROM user WHERE name = $name`,
};

type UserItem = {
  name: string;
  pwd: string;
};

export class User {
  private db: Database;

  private STATEMENTS: {
    Query: Statement<UserItem, { $name: string }[]>;
    Upsert: Statement<UserItem, UserItem[]>;
    Remove: Statement<UserItem, { $name: string }[]>;
  } = {} as any;
  constructor(name: string) {
    this.db = new Database(name ?? ":memory:", { create: true });
    this.db.exec(SQL.WAL);
    this.db.prepare(SQL.CREATE).run();
    this.db.prepare(SQL.INDEXS).run();
    this.STATEMENTS.Query = this.db.query(SQL.Query);
    this.STATEMENTS.Upsert = this.db.query(SQL.Upsert);
    this.STATEMENTS.Remove = this.db.query(SQL.Remove);
  }

  get(name: string) {
    return this.STATEMENTS.Query.get({ $name: name });
  }
  upsert(neo: { name: string; pwd: string }) {
    return this.STATEMENTS.Upsert.run(neo);
  }
  remove(name: string) {
    return this.STATEMENTS.Remove.run({ $name: name });
  }
}
const db = new User(database);

export const user = {
  async upsert(user: UserItem) {
    const hash = await Bun.password.hash(user.pwd);
    db.upsert({
      name: user.name,
      pwd: hash,
    });
    return db.get(user.name);
  },
  async verify(user: UserItem) {
    const has = db.get(user.name);
    if (!has) {
      throw markError("ForbiddenError");
    }
    // verify hash
    const ok = await Bun.password.verify(user.pwd, has.pwd);
    if (ok) {
      return db.get(user.name);
    } else {
      throw markError("UnAuthorizedError");
    }
  },
};
