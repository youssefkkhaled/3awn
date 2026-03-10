declare module "node:sqlite" {
  export class StatementSync {
    get(...params: Array<string | number | null>): Record<string, unknown> | undefined;
    all(...params: Array<string | number | null>): Record<string, unknown>[];
    run(...params: Array<string | number | null>): {
      changes: number;
      lastInsertRowid: number | bigint;
    };
  }

  export class DatabaseSync {
    constructor(filename: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }
}
