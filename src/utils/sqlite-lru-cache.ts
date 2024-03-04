import { Database, Statement } from "bun:sqlite";
import { serialize, deserialize } from "v8";

export type SqlCacheOptions<Meta> = {
  database?: string;
  maxLen: number;
  maxByteSize: number;
  onRemove?: (items: CacheItem<Meta>[]) => void;
};

type CacheItem<Meta> = {
  /** 主键 key */
  key: string;
  /** 序列化 JSON Object */
  meta?: Meta;
  /** 存储空间 */
  bytesize: number;
  /** 最近访问时间  Date.unix() */
  access?: number;
  /** 过期时间 Date.unx() 跟 access 互斥 */
  expire?: number;
  /** 是否待清理 */
  dead?: 0 | 1;
};

type QueryCacheItem = {
  /** 主键 key */
  $key: string;
  /** 当前时间 */
  $now: number;
  /** 序列化后的 JSON Object */
  $meta: ReturnType<typeof serialize>;
  /** 存储空间 */
  $bytesize: number;
  /** 最近访问时间 Date.unix() **/
  $access: number;
  /** 过期时间 Date.unix() **/
  $expire: number;
};

// insprid by https://github.com/notskamr/bun-sqlite-cache/blob/main/src/index.ts

export class SqliteLRUCache<Meta> {
  db: Database;
  maxLen: SqlCacheOptions<Meta>["maxLen"];
  maxByteSize: SqlCacheOptions<Meta>["maxByteSize"];
  onRemove: SqlCacheOptions<Meta>["onRemove"];

  private SQL: {
    GET_EXEC: Statement<void, Pick<QueryCacheItem, "$key" | "$now">[]>;
    GET: Statement<CacheItem<Meta>, Pick<QueryCacheItem, "$key">[]>;
    SET: Statement<number, Omit<QueryCacheItem, "$now">[]>;
    LENGTH_LMITED: Statement<string, { $maxLen: number }[]>;
    POP: Statement<string, []>;
    SUM: Statement<{ sum: number }, []>;
    KILLED: Statement<CacheItem<Meta>, []>;
    EXPIRED: Statement<CacheItem<Meta>, { $now: number }[]>;
    SHUTDOWN: Statement;
    DANGER_DROP_FORM: Statement<void, []>;
  } = {
    GET_EXEC: null!,
    GET: null!,
    SET: null!,
    LENGTH_LMITED: null!,
    POP: null!,
    SUM: null!,
    KILLED: null!,
    EXPIRED: null!,
    SHUTDOWN: null!,
    DANGER_DROP_FORM: null!,
  };

  constructor({
    database,
    maxLen = 50 * 1000,
    maxByteSize = 1 * Math.pow(2, 30),
    onRemove = () => {},
  }: SqlCacheOptions<Meta>) {
    // this.db = new Database(database ?? ":memory:", { create: true });
    this.db = new Database(":memory:");
    this.maxLen = maxLen;
    this.maxByteSize = maxByteSize;
    this.onRemove = onRemove;
    this._initdb(this.db);
  }

  private _initdb(db: Database) {
    db.exec("PRAGMA journal_mode = WAL;");
    db.transaction(() => {
      // 初始化
      db.prepare(
        `CREATE TABLE IF NOT EXISTS cache (
          key TEXT PRIMARY KEY,
          meta BLOB,
          bytesize INT,
          access INT,
          expire INT,
          dead INT
        )`,
      ).run();
      // 创建索引
      db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS key ON cache (key)").run();
      db.prepare("CREATE INDEX IF NOT EXISTS access ON cache (access)").run();
      db.prepare("CREATE INDEX IF NOT EXISTS dead ON cache (dead)").run();
    })();

    // 查询没死的值, 更新 access 时间
    this.SQL.GET_EXEC = db.prepare(`
      UPDATE OR IGNORE cache
      SET access = $now, dead = 0
      WHERE key = $key AND (dead = 0)`);
    // 设置新的值
    // 根据 key 查询
    this.SQL.GET = db.query(`
      SELECT * FROM cache WHERE key = $key
    `);
    // 查询没死的值, 更新 access 时间
    this.SQL.SET = db.query(`
      INSERT OR REPLACE INTO cache (key, meta, bytesize, access, dead) 
      VALUES ($key, $meta, $bytesize, $access, 0) 
    `);
    // 查询长度超限的值, 判死刑
    this.SQL.LENGTH_LMITED = db.query(`
      WITH kill AS (SELECT key FROM cache ORDER BY access DESC LIMIT -1 OFFSET $maxLen)
      UPDATE OR IGNORE cache
      SET dead = 1 WHERE key in kill
    `);
    // 将最久未使用的一条判死刑
    this.SQL.POP = db.query(`
      WITH kill AS (SELECT key FROM cache WHERE dead = 0 ORDER BY access ASC LIMIT 1)
      UPDATE OR IGNORE cache
      SET dead = 1 WHERE key in kill
    `);
    // 获取没死的 bytesize 集合
    this.SQL.SUM = db.query(`
      SELECT SUM(bytesize) as sum  FROM cache WHERE dead = 0;
    `);
    // 获取要死的文件列表
    this.SQL.KILLED = db.query(`
      SELECT * FROM cache WHERE dead = 1;
    `);
    // 获取要过期的
    this.SQL.EXPIRED = db.query(`
      DELETE FROM cache WHERE expire < $now;
    `);
    // 执行死刑
    this.SQL.SHUTDOWN = db.query(`
      DELETE FROM cache WHERE dead = 1;
    `);
    this.SQL.DANGER_DROP_FORM = db.query(`
      DELETE FROM cache
    `);
  }

  print(tag?: string) {
    console.table(this.db.query("SELECT * FROM cache").all());
  }

  get(key: string, nowis?: number) {
    const now = nowis ?? Date.now();
    this.SQL.GET_EXEC.run({
      $key: key,
      $now: now,
    });
    const answer = this.SQL.GET.get({ $key: key });
    if (answer) {
      // 处理过期情况
      if (now > answer.expire!) {
        return null;
      }
      answer.meta = deserialize(answer.meta as any);
    }
    return answer;
  }

  set(item: CacheItem<Meta>) {
    this.autoClean(item.bytesize);
    return this.SQL.SET.run({
      $key: item.key,
      $meta: serialize(item.meta),
      $bytesize: item.bytesize,
      $access: item.access ?? Date.now(),
      $expire: item.expire ?? 0,
    });
  }

  dangerDrop() {
    return this.SQL.DANGER_DROP_FORM.run();
  }

  private autoClean(appendSize: CacheItem<Meta>["bytesize"]) {
    this.SQL.LENGTH_LMITED.run({
      $maxLen: this.maxLen - 1,
    });

    /** 先清理过期的 */
    this.SQL.EXPIRED.run({
      $now: Date.now(),
    });

    while (
      // this.print(
      //   `before pop sum is ${
      //     this.SQL.SUM.get()?.sum ?? 0
      //   } appendSize is ${appendSize} limit is ${
      //     this.maxByteSize - appendSize
      //   }`,
      // )! ||
      (this.SQL.SUM.get()?.sum ?? 0) >
      this.maxByteSize - appendSize
    ) {
      this.SQL.POP.run();
    }

    const items = this.SQL.KILLED.all();
    if (this.onRemove && items.length > 0) {
      this.onRemove(items);
    }
    this.SQL.SHUTDOWN.run();
  }
}
