import { Database, Statement } from "bun:sqlite";
import { serialize, deserialize } from "v8";

export type SqlCacheOptions<Meta> = {
  /** name (in memory) of path string (file) */
  database?: string;
  /** max items */
  maxLen: number;
  /** max bytesize */
  maxByteSize: number;
  /** removed items  */
  onRemove?: (items: CacheItem<Meta>[], reason: string) => void;
};

type CacheItem<Meta> = {
  /** 主键 key */
  key: string;
  /** 序列化 JSON Object, bytesize 和 meta 必须有一个存在 */
  meta?: Meta;
  /** 存储空间 */
  bytesize?: number;
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

const SQL = {
  WAL: `PRAGMA journal_mode = WAL;`,
  /** 创建表 */
  CREATE: `
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      meta BLOB,
      bytesize INT,
      access INT,
      expire INT,
      dead INT
    )`,
  /** 创建表 */
  INDEXS: [
    `CREATE UNIQUE INDEX IF NOT EXISTS key ON cache (key)`,
    `CREATE INDEX IF NOT EXISTS access ON cache (access)`,
    `CREATE INDEX IF NOT EXISTS dead ON cache (dead)`,
  ],
  QueryAliveByKey: `SELECT * FROM cache WHERE key = $key AND dead = 0`,
  GetWithUpdate: `
    UPDATE OR IGNORE cache
    SET access = $now, dead = 0
    WHERE (key = $key) AND (dead = 0) 
  `,
  Upsert: `
    INSERT OR REPLACE INTO cache (key, meta, bytesize, access, expire, dead) 
    VALUES ($key, $meta, $bytesize, $access, $expire, 0) 
  `,
  KillByLengthLimit: `
    WITH kill AS (SELECT key FROM cache ORDER BY access DESC LIMIT -1 OFFSET $maxLength)
    UPDATE OR IGNORE cache
    SET dead = 1 WHERE key in kill
  `,
  KillByLongestUseless: `
    WITH kill AS (SELECT key FROM cache WHERE dead = 0 ORDER BY access ASC LIMIT 1)
    UPDATE OR IGNORE cache
    SET dead = 1 WHERE key in kill
  `,
  KillByExpired: `
    UPDATE OR IGNORE cache
    SET dead = 1
    WHERE expire > 0 AND expire < $now;
  `,
  SumOfSize: `
    SELECT SUM(bytesize) as sum  FROM cache WHERE dead = 0;
  `,
  ListOfDeath: `
    SELECT * FROM cache WHERE dead = 1;
  `,
  ExecShutDown: `
    DELETE FROM cache WHERE dead = 1;
  `,
  DangerousDropFrom: `
     DELETE FORM cache
  `,
};

// insprid by https://github.com/notskamr/bun-sqlite-cache/blob/main/src/index.ts

export class SqliteLRUCache<Meta> {
  private db: Database;
  private options: SqlCacheOptions<Meta>;
  private STATEMENTS: {
    QueryAliveByKey: Statement<CacheItem<Meta>, Pick<QueryCacheItem, "$key">[]>;
    GetWithUpdate: Statement<
      CacheItem<Meta>,
      Pick<QueryCacheItem, "$key" | "$now">[]
    >;
    Upsert: Statement<CacheItem<Meta>, Omit<QueryCacheItem, "$now">[]>;
    KillByLengthLimit: Statement<CacheItem<Meta>, { $maxLength: number }[]>;
    KillByLongestUseless: Statement<string, []>;
    KillByExpired: Statement<CacheItem<Meta>, Pick<QueryCacheItem, "$now">[]>;
    SumOfSize: Statement<{ sum: number }, []>;
    ListOfDeath: Statement<CacheItem<Meta>, []>;
    ExecShutDown: Statement;
  } = {} as any;
  constructor(options: SqlCacheOptions<Meta>) {
    const {
      database,
      maxLen = 50 * 1000,
      maxByteSize = 1 * Math.pow(2, 30),
      onRemove = () => {},
    } = options;
    console.log(`🚀 ~ SqliteLRUCache<Meta> ~ sqlite init a:`, database);
    this.db = new Database(database ?? ":memory:", { create: true });
    this.options = {
      maxLen,
      maxByteSize,
      onRemove,
    };
    this._initdb(this.db);
  }

  private _initdb(db: Database) {
    db.exec(SQL.WAL);
    db.prepare(SQL.CREATE).run();
    SQL.INDEXS.forEach((sql) => db.prepare(sql).run());

    this.STATEMENTS.QueryAliveByKey = db.query(SQL.QueryAliveByKey);
    this.STATEMENTS.GetWithUpdate = db.query(SQL.GetWithUpdate);
    this.STATEMENTS.Upsert = db.query(SQL.Upsert);
    this.STATEMENTS.KillByLengthLimit = db.query(SQL.KillByLengthLimit);
    this.STATEMENTS.KillByLongestUseless = db.query(SQL.KillByLongestUseless);
    this.STATEMENTS.KillByExpired = db.query(SQL.KillByExpired);
    this.STATEMENTS.SumOfSize = db.query(SQL.SumOfSize);
    this.STATEMENTS.ListOfDeath = db.query(SQL.ListOfDeath);
    this.STATEMENTS.ExecShutDown = db.query(SQL.ExecShutDown);
  }

  print(tag?: string) {
    console.table(
      this.db
        .query("SELECT * FROM cache")
        .all()
        .map((item: any) => {
          return {
            ...item,
            meta: deserialize(item.meta),
          };
        }),
    );
  }

  get(key: string, nowis?: number) {
    const now = nowis ?? Date.now();
    this.expired("get", now);

    this.STATEMENTS.GetWithUpdate.run({
      $key: key,
      $now: now,
    });
    const ret = this.STATEMENTS.QueryAliveByKey.get({ $key: key });
    if (ret) {
      ret.meta = deserialize(ret.meta as any);
    }
    return ret;
  }

  set(item: CacheItem<Meta>, nowis?: number) {
    const now = nowis ?? item.access ?? Date.now();
    this.autoClean(item.bytesize, now);
    const buffer = serialize(item.meta);

    return this.STATEMENTS.Upsert.run({
      $key: item.key,
      $meta: serialize(item.meta),
      $bytesize: item.bytesize ?? Buffer.byteLength(buffer),
      $access: now,
      $expire: item.expire ?? 0,
    });
  }

  private execDelete(reason: string) {
    // 获取要 gg 的
    const items = this.STATEMENTS.ListOfDeath.all();
    // 触发事件
    try {
      this.options.onRemove!(items, reason);
    } catch (error) {}
    // 执行清理
    this.STATEMENTS.ExecShutDown.run();
  }

  private expired(prefix: string, nowis?: number) {
    const now = nowis ?? Date.now();
    // 标记为gg
    this.STATEMENTS.KillByExpired.run({ $now: now });
    this.execDelete(`${prefix}:expired`);
  }

  private autoClean(appendSize: CacheItem<Meta>["bytesize"], nowis?: number) {
    this.expired("autoclean", nowis);

    this.STATEMENTS.KillByLengthLimit.run({
      $maxLength: this.options.maxLen - 1,
    });

    if (Bun.env.NODE_ENV !== "production") {
      // 执行下面一次就够了， 这里是为了 debug
      this.execDelete("len limit");
    }

    while (
      // this.print(
      //   `before pop sum is ${
      //     this.SQL.SUM.get()?.sum ?? 0
      //   } appendSize is ${appendSize} limit is ${
      //     this.maxByteSize - appendSize
      //   }`,
      // )! ||
      (this.STATEMENTS.SumOfSize.get()?.sum ?? 0) >
      this.options.maxByteSize - appendSize!
    ) {
      this.STATEMENTS.KillByLongestUseless.run();
    }

    this.execDelete("lru size");
  }
}
