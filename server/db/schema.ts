import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { InferSelectModel } from "drizzle-orm";

// Orgs table
export const orgs = sqliteTable("orgs", {
    orgId: integer("orgId").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    domain: text("domain").notNull(),
});

// Users table
export const users = sqliteTable("users", {
    userId: integer("userId").primaryKey({ autoIncrement: true }),
    orgId: integer("orgId").references(() => orgs.orgId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    groups: text("groups"),
});

// Sites table
export const sites = sqliteTable("sites", {
    siteId: integer("siteId").primaryKey({ autoIncrement: true }),
    orgId: integer("orgId").references(() => orgs.orgId, { onDelete: "cascade" }),
    exitNode: integer("exitNode").references(() => exitNodes.exitNodeId, { onDelete: "set null" }),
    name: text("name").notNull(),
    subdomain: text("subdomain"),
    pubKey: text("pubKey"),
    subnet: text("subnet"),
});

// Resources table
export const resources = sqliteTable("resources", {
    resourceId: text("resourceId", { length: 2048 }).primaryKey(),
    siteId: integer("siteId").references(() => sites.siteId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    subdomain: text("subdomain"),
});

// Targets table
export const targets = sqliteTable("targets", {
    targetId: integer("targetId").primaryKey({ autoIncrement: true }),
    resourceId: text("resourceId").references(() => resources.resourceId, { onDelete: "cascade" }),
    ip: text("ip").notNull(),
    method: text("method"),
    port: integer("port"),
    protocol: text("protocol"),
});

// Exit Nodes table
export const exitNodes = sqliteTable("exitNodes", {
    exitNodeId: integer("exitNodeId").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    address: text("address").notNull(),
    privateKey: text("privateKey"),
    listenPort: integer("listenPort"),
});

// Routes table
export const routes = sqliteTable("routes", {
    routeId: integer("routeId").primaryKey({ autoIncrement: true }),
    exitNodeId: integer("exitNodeId").references(() => exitNodes.exitNodeId, { onDelete: "cascade" }),
    subnet: text("subnet").notNull(),
});

// Define the model types for type inference
export type Org = InferSelectModel<typeof orgs>;
export type User = InferSelectModel<typeof users>;
export type Site = InferSelectModel<typeof sites>;
export type Resource = InferSelectModel<typeof resources>;
export type ExitNode = InferSelectModel<typeof exitNodes>;
export type Route = InferSelectModel<typeof routes>;
export type Target = InferSelectModel<typeof targets>;