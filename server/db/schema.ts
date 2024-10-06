import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { InferSelectModel } from "drizzle-orm";

// Orgs table
export const orgs = sqliteTable("orgs", {
    orgId: integer("orgId").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    domain: text("domain").notNull(),
});

// Sites table
export const sites = sqliteTable("sites", {
    siteId: integer("siteId").primaryKey({ autoIncrement: true }),
    orgId: integer("orgId").references(() => orgs.orgId, {
        onDelete: "cascade",
    }),
    exitNode: integer("exitNode").references(() => exitNodes.exitNodeId, {
        onDelete: "set null",
    }),
    name: text("name").notNull(),
    subdomain: text("subdomain"),
    pubKey: text("pubKey"),
    subnet: text("subnet"),
    megabytesIn: integer("bytesIn"),
    megabytesOut: integer("bytesOut"),
});

// Resources table
export const resources = sqliteTable("resources", {
    resourceId: text("resourceId", { length: 2048 }).primaryKey(),
    siteId: integer("siteId").references(() => sites.siteId, {
        onDelete: "cascade",
    }),
    orgId: integer("orgId").references(() => orgs.orgId, {
        onDelete: "cascade",
    }),
    name: text("name").notNull(),
    subdomain: text("subdomain"),
});

// Targets table
export const targets = sqliteTable("targets", {
    targetId: integer("targetId").primaryKey({ autoIncrement: true }),
    resourceId: text("resourceId").references(() => resources.resourceId, {
        onDelete: "cascade",
    }),
    ip: text("ip").notNull(),
    method: text("method").notNull(),
    port: integer("port").notNull(),
    protocol: text("protocol"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
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
    exitNodeId: integer("exitNodeId").references(() => exitNodes.exitNodeId, {
        onDelete: "cascade",
    }),
    subnet: text("subnet").notNull(),
});

// Users table
export const users = sqliteTable("user", {
    id: text("id").primaryKey(), // has to be id not userId for lucia
    email: text("email").notNull().unique(),
    passwordHash: text("passwordHash").notNull(),
    twoFactorEnabled: integer("twoFactorEnabled", { mode: "boolean" })
        .notNull()
        .default(false),
    twoFactorSecret: text("twoFactorSecret"),
    emailVerified: integer("emailVerified", { mode: "boolean" })
        .notNull()
        .default(false),
});

export const twoFactorBackupCodes = sqliteTable("twoFactorBackupCodes", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    codeHash: text("codeHash").notNull(),
});

// Sessions table
export const sessions = sqliteTable("session", {
    id: text("id").primaryKey(), // has to be id not sessionId for lucia
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expiresAt").notNull(),
});

export const userOrgs = sqliteTable("userOrgs", {
    userId: text("userId")
        .notNull()
        .references(() => users.id),
    orgId: integer("orgId")
        .notNull()
        .references(() => orgs.orgId),
    roleId: integer("roleId").notNull().references(() => roles.roleId),
});

export const emailVerificationCodes = sqliteTable("emailVerificationCodes", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    code: text("code").notNull(),
    expiresAt: integer("expiresAt").notNull(),
});

export const passwordResetTokens = sqliteTable("passwordResetTokens", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("tokenHash").notNull(),
    expiresAt: integer("expiresAt").notNull(),
});

export const actions = sqliteTable("actions", {
    actionId: integer("actionId").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description"),
});

export const roles = sqliteTable("roles", {
    roleId: integer("roleId").primaryKey({ autoIncrement: true }),
    orgId: integer("orgId").references(() => orgs.orgId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
});

export const roleActions = sqliteTable("roleActions", {
    roleId: integer("roleId")
        .notNull()
        .references(() => roles.roleId, { onDelete: "cascade" }),
    actionId: integer("actionId")
        .notNull()
        .references(() => actions.actionId, { onDelete: "cascade" }),
    orgId: integer("orgId")
        .notNull()
        .references(() => orgs.orgId, { onDelete: "cascade" }),
});

export const userActions = sqliteTable("userActions", {
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    actionId: integer("actionId")
        .notNull()
        .references(() => actions.actionId, { onDelete: "cascade" }),
    orgId: integer("orgId")
        .notNull()
        .references(() => orgs.orgId, { onDelete: "cascade" }),
});

export const roleSites = sqliteTable("roleSites", {
    roleId: integer("roleId")
        .notNull()
        .references(() => roles.roleId, { onDelete: "cascade" }),
    siteId: integer("siteId")
        .notNull()
        .references(() => sites.siteId, { onDelete: "cascade" }),
});

export const userSites = sqliteTable("userSites", {
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    siteId: integer("siteId")
        .notNull()
        .references(() => sites.siteId, { onDelete: "cascade" }),
});

export const roleResources = sqliteTable("roleResources", {
    roleId: integer("roleId")
        .notNull()
        .references(() => roles.roleId, { onDelete: "cascade" }),
    resourceId: text("resourceId")
        .notNull()
        .references(() => resources.resourceId, { onDelete: "cascade" }),
});

export const userResources = sqliteTable("userResources", {
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    resourceId: text("resourceId")
        .notNull()
        .references(() => resources.resourceId, { onDelete: "cascade" }),
});

// Define the model types for type inference
export type Org = InferSelectModel<typeof orgs>;
export type User = InferSelectModel<typeof users>;
export type Site = InferSelectModel<typeof sites>;
export type Resource = InferSelectModel<typeof resources>;
export type ExitNode = InferSelectModel<typeof exitNodes>;
export type Route = InferSelectModel<typeof routes>;
export type Target = InferSelectModel<typeof targets>;
export type Session = InferSelectModel<typeof sessions>;
export type EmailVerificationCode = InferSelectModel<
    typeof emailVerificationCodes
>;
export type TwoFactorBackupCode = InferSelectModel<typeof twoFactorBackupCodes>;
export type PasswordResetToken = InferSelectModel<typeof passwordResetTokens>;
export type Role = InferSelectModel<typeof roles>;
export type Action = InferSelectModel<typeof actions>;
export type RoleAction = InferSelectModel<typeof roleActions>;
export type UserAction = InferSelectModel<typeof userActions>;
export type RoleSite = InferSelectModel<typeof roleSites>;
export type UserSite = InferSelectModel<typeof userSites>;
export type RoleResource = InferSelectModel<typeof roleResources>;
export type UserResource = InferSelectModel<typeof userResources>;