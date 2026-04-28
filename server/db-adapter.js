/**
 * node:sqlite(DatabaseSync)를 D1 스타일 async API로 래핑 (로컬 개발용)
 */
export function wrapSqlite(db) {
  return {
    prepare: (sql) => ({
      bind: (...params) => ({
        first: () => Promise.resolve(db.prepare(sql).get(...params)),
        all: () => Promise.resolve({ results: db.prepare(sql).all(...params) }),
        run: () => {
          const r = db.prepare(sql).run(...params);
          return Promise.resolve({ meta: { last_row_id: r.lastInsertRowid, changes: r.changes } });
        }
      })
    })
  };
}
