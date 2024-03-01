import { Database, Statement } from "bun:sqlite";

export class UserDB {
  db: Database;

  constructor() {
    this.db = new Database("user.db", { create: true });
    this._initdb(this.db);
  }

  private _initdb(db: Database) {
    db.exec("PRAGMA journal_mode = WAL;");
    db.transaction(() => {
      // 初始化
      db.prepare(
        `CREATE TABLE IF NOT EXISTS user (
          username TEXT PRIMARY KEY,
          passwd BLOB,
          ban INT
        )`,
      ).run();
      // 创建索引
      db.prepare(
        "CREATE INDEX IF NOT EXISTS username ON cache (username)",
      ).run();
    })();
  }
}
