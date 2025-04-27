// This file is licensed under the Fossorial Commercial License.
// Unauthorized use, copying, modification, or distribution is strictly prohibited.
//
// Copyright (c) 2025 Fossorial LLC. All rights reserved.

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const licenseKey = sqliteTable("licenseKey", {
    licenseKeyId: text("licenseKeyId").primaryKey().notNull(),
    instanceId: text("instanceId").notNull(),
    token: text("token").notNull()
});

export const hostMeta = sqliteTable("hostMeta", {
    hostMetaId: text("hostMetaId").primaryKey().notNull(),
    createdAt: integer("createdAt").notNull()
});
