"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const drizzle_orm_1 = require("drizzle-orm");
const database_setup_1 = require("../config/database_setup");
const reset = async () => {
    try {
        console.log("Dropping schema...");
        await database_setup_1.db.execute((0, drizzle_orm_1.sql) `DROP SCHEMA public CASCADE;`);
        await database_setup_1.db.execute((0, drizzle_orm_1.sql) `CREATE SCHEMA public;`);
        await database_setup_1.db.execute((0, drizzle_orm_1.sql) `GRANT ALL ON SCHEMA public TO public;`);
        console.log("Schema reset successfully.");
    }
    catch (e) {
        console.error(e);
    }
    process.exit(0);
};
reset();
