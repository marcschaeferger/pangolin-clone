import { InferSelectModel } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const schools = sqliteTable("schools", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name"),
    abbreviation: text("abbreviation"),
});

export type SelectSchoolType = InferSelectModel<typeof schools>;
