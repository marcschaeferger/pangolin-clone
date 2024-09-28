import { InferSelectModel } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const proxyTargets = sqliteTable("proxyTargets", {
    id: text("id").unique().notNull().primaryKey(),
    target: text("target").notNull(),
    rule: text("rule").notNull(),
    entryPoint: text("entryPoint").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
});

export type SelectProxyTargets = InferSelectModel<typeof proxyTargets>;
