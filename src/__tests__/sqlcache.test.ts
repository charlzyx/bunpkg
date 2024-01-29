import { describe, it, expect } from "bun:test";

import { SqliteLRUCache } from "../utils/sqlite-lru-cache";

const getSql = () => {
  const ref = {
    current: [] as string[],
  };
  const sql = new SqliteLRUCache({
    maxLen: 3,
    maxByteSize: 6,
    onRemove(items) {
      ref.current = items.map((x) => x.key);
    },
  });
  sql.set({
    key: "a",
    bytesize: 1,
    access: 1,
    meta: { hash: 1 },
  });
  sql.set({
    key: "b",
    bytesize: 2,
    access: 2,
    meta: { hash: 2 },
  });
  sql.set({
    key: "c",
    bytesize: 3,
    access: 3,
    meta: {
      hash: 3,
    },
  });
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
      dead: 0,
    });
  });
});
