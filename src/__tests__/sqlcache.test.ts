import { describe, it, expect } from "bun:test";

import { SqliteLRUCache } from "../common/sqlite-lru-cache";

const getSql = (expire?: boolean) => {
  const ref = {
    current: [] as string[],
  };
  const sql = new SqliteLRUCache({
    maxLen: 3,
    maxByteSize: 6,
    onRemove(items, reason) {
      // console.log(`🚀 ~ onRemove ~ items:`, reason, items);
      ref.current = ref.current.concat(items.map((x) => x.key));
    },
  });
  sql.set(
    {
      key: "a",
      bytesize: 1,
      access: 1,
      expire: expire ? 1 : 0,
      meta: { hash: 1 },
    },
    0,
  );
  sql.set(
    {
      key: "b",
      bytesize: 2,
      access: 2,
      expire: expire ? 2 : 0,
      meta: { hash: 2 },
    },
    0,
  );
  sql.set(
    {
      key: "c",
      bytesize: 3,
      access: 3,
      expire: expire ? 3 : 0,
      meta: {
        hash: 3,
      },
    },
    0,
  );
  return [sql, ref] as const;
};
describe("sql lru cache", () => {
  it("init", () => {
    const [sql, dead] = getSql();
    sql.print();
    expect(sql.get("a", 1)).toEqual({
      key: "a",
      bytesize: 1,
      access: 1,
      expire: 0,
      meta: { hash: 1 },
      dead: 0,
    });
    expect(dead.current).toEqual([]);
  });

  it("autocalen for length limit", () => {
    const [sql, dead] = getSql();
    sql.set({ key: "d", bytesize: 1, access: 4 });
    sql.print();
    expect(dead.current).toEqual(["a"]);
    expect(sql.get("a")).toEqual(null);
    expect(sql.get("b", 2)).toEqual({
      key: "b",
      bytesize: 2,
      access: 2,
      expire: 0,
      dead: 0,
      meta: { hash: 2 },
    });
  });

  it("autocalen for size limit", () => {
    const [sql, dead] = getSql();
    sql.set({ key: "d", bytesize: 4, access: 4 });
    sql.print();
    expect(dead.current).toEqual(["a", "b", "c"]);
    expect(sql.get("a")).toEqual(null);
    expect(sql.get("b")).toEqual(null);
    expect(sql.get("c")).toEqual(null);
    expect(sql.get("d", 4)).toEqual({
      key: "d",
      bytesize: 4,
      access: 4,
      expire: 0,
      dead: 0,
    });
  });

  it("autocalen for expired", () => {
    const [sql, dead] = getSql(true);
    let now = 2;
    const expired = sql.get("a", now);
    expect(expired).toEqual(null);
    expect(dead.current).toEqual(["a"]);
    sql.print();
    now = 3;
    sql.set({ key: "d", bytesize: 2, access: 4 }, now);
    sql.print();
    expect(dead.current).toEqual(["a", "b"]);
    expect(sql.get("a", now)).toEqual(null);
    expect(sql.get("b", now)).toEqual(null);
    sql.print();
    expect(sql.get("c", now)).toEqual({
      key: "c",
      bytesize: 3,
      access: 3,
      expire: 3,
      dead: 0,
      meta: {
        hash: 3,
      },
    });

    sql.print();
    now = 4;
    expect(sql.get("d", now)).toEqual({
      key: "d",
      bytesize: 2,
      access: 4,
      expire: 0,
      dead: 0,
    });
    expect(sql.get("c", now)).toEqual(null);
  });

  it("complex", () => {
    const [sql, dead] = getSql(true);
    let now = 2;
    const expired = sql.get("a", now);
    expect(expired).toEqual(null);
    expect(dead.current).toEqual(["a"]);
    now = 3;
    sql.set({ key: "d", bytesize: 4, expire: 0, access: 4 }, now);
    expect(dead.current).toEqual(["a", "b", "c"]);
    // a case by expire
    expect(sql.get("a", now)).toEqual(null);
    // b case by expire
    expect(sql.get("b", now)).toEqual(null);
    // c case by size limit
    expect(sql.get("c", now)).toEqual(null);
    now = 5;
    // expire not work on expire: 0
    expect(sql.get("d", now)).toEqual({
      key: "d",
      bytesize: 4,
      // access update by now
      access: 5,
      expire: 0,
      dead: 0,
    });
    now = 6;
    sql.set({ key: "e", bytesize: 0, expire: 0 }, now);
    now = 7;
    sql.set({ key: "f", bytesize: 0, expire: 0 }, now);
    now = 8;
    sql.set({ key: "g", bytesize: 0, expire: 0 }, now);
    // remove d by maxLen
    expect(dead.current).toEqual(["a", "b", "c", "d"]);
    expect(sql.get("e", now)).toEqual({
      key: "e",
      bytesize: 0,
      expire: 0,
      access: now,
      dead: 0,
    });
    expect(sql.get("f", now)).toEqual({
      key: "f",
      bytesize: 0,
      expire: 0,
      access: now,
      dead: 0,
    });
    expect(sql.get("g", now)).toEqual({
      key: "g",
      bytesize: 0,
      expire: 0,
      access: now,
      dead: 0,
    });
    sql.print();
  });
});
