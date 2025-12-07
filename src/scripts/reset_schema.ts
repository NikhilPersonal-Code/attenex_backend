import { sql } from "drizzle-orm";
import { db } from "../config/database_setup";

const reset = async () => {
  try {
    console.log("Dropping schema...");
    await db.execute(sql`DROP SCHEMA public CASCADE;`);
    await db.execute(sql`CREATE SCHEMA public;`);
    await db.execute(sql`GRANT ALL ON SCHEMA public TO public;`);
    console.log("Schema reset successfully.");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
};

reset();
