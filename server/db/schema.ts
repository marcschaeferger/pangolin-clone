import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { InferSelectModel } from "drizzle-orm";

// Org table
export const org = sqliteTable("org", {
  orgId: integer("orgId").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});

// Users table
export const users = sqliteTable("users", {
  uid: integer("uid").primaryKey({ autoIncrement: true }),
  orgId: integer("orgId").references(() => org.orgId),
  name: text("name"),
  email: text("email"),
  groups: text("groups"),
});

// Sites table
export const sites = sqliteTable("sites", {
  siteId: integer("siteId").primaryKey({ autoIncrement: true }),
  orgId: integer("orgId").references(() => org.orgId),
  name: text("name"),
  autoSubdomain: text("autoSubdomain"),
  pubKey: integer("pubKey"),
  subnet: text("subnet"),
  exitNode: integer("exitNode").references(() => exitNodes.exitNodeId),
});

// Resources table
export const resources = sqliteTable("resources", {
  resourceId: integer("resourceId").primaryKey({ autoIncrement: true }),
  siteId: integer("siteId").references(() => sites.siteId),
  name: text("name"),
  targetIp: text("targetIp"),
  method: text("method"),
  port: integer("port"),
  proto: text("proto"),
});

// Exit Nodes table
export const exitNodes = sqliteTable("exitNodes", {
  exitNodeId: integer("exitNodeId").primaryKey({ autoIncrement: true }),
  name: text("name"),
  address: integer("address"),
});

// Routes table
export const routes = sqliteTable("routes", {
  routeId: integer("routeId").primaryKey({ autoIncrement: true }),
  subnet: integer("subnet"),
  exitNodeId: integer("exitNodeId").references(() => exitNodes.exitNodeId),
});

// Define the model types for type inference
export type Org = InferSelectModel<typeof org>;
export type User = InferSelectModel<typeof users>;
export type Site = InferSelectModel<typeof sites>;
export type Resource = InferSelectModel<typeof resources>;
export type ExitNode = InferSelectModel<typeof exitNodes>;
export type Route = InferSelectModel<typeof routes>;
