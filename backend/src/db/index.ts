import { Kysely, PostgresDialect } from "kysely";
import { Pool, types } from "pg";
import { env } from "../config/env";
import type { Database } from "./types";

// DATE columns are pure calendar dates (start_date/end_date, no time-of-day
// meaning). pg's default parser turns them into a JS Date at local midnight,
// which then shifts to the wrong calendar day once serialized to UTC ISO
// strings. Keep them as the raw "YYYY-MM-DD" string instead, matching the
// `string` type already declared for these columns in db/types.ts.
types.setTypeParser(types.builtins.DATE, (value) => value);

const pool = new Pool({
  connectionString: env.databaseUrl,
});

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
});
