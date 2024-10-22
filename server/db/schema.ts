import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { InferSelectModel} from "drizzle-orm";

export const orgs = sqliteTable("orgs", {
    orgId: text("orgId").primaryKey(),
    name: text("name").notNull(),
    domain: text("domain").notNull(),
});

export const sites = sqliteTable("sites", {
    siteId: integer("siteId").primaryKey({ autoIncrement: true }),
    orgId: text("orgId").references(() => orgs.orgId, {
        onDelete: "cascade",
    }),
    niceId: text("niceId").notNull(),
    exitNode: integer("exitNode").references(() => exitNodes.exitNodeId, {
        onDelete: "set null",
    }),
    name: text("name").notNull(),
    pubKey: text("pubKey"),
    subnet: text("subnet"),
    megabytesIn: integer("bytesIn"),
    megabytesOut: integer("bytesOut"),
});

export const resources = sqliteTable("resources", {
    resourceId: integer("resourceId").primaryKey({ autoIncrement: true }),
    fullDomain: text("fullDomain", { length: 2048 }),
    siteId: integer("siteId").references(() => sites.siteId, {
        onDelete: "cascade",
    }),
    orgId: text("orgId").references(() => orgs.orgId, {
        onDelete: "cascade",
    }),
    name: text("name").notNull(),
    subdomain: text("subdomain"),
});

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
    ssl: integer("ssl", { mode: "boolean" }).notNull().default(false),
});

export const exitNodes = sqliteTable("exitNodes", {
    exitNodeId: integer("exitNodeId").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    address: text("address").notNull(),
    privateKey: text("privateKey"),
    listenPort: integer("listenPort"),
});

export const routes = sqliteTable("routes", {
    routeId: integer("routeId").primaryKey({ autoIncrement: true }),
    exitNodeId: integer("exitNodeId").references(() => exitNodes.exitNodeId, {
        onDelete: "cascade",
    }),
    subnet: text("subnet").notNull(),
});

export const users = sqliteTable("user", {
    userId: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("passwordHash").notNull(),
    twoFactorEnabled: integer("twoFactorEnabled", { mode: "boolean" })
        .notNull()
        .default(false),
    twoFactorSecret: text("twoFactorSecret"),
    emailVerified: integer("emailVerified", { mode: "boolean" })
        .notNull()
        .default(false),
    dateCreated: text("dateCreated").notNull(),
});

export const twoFactorBackupCodes = sqliteTable("twoFactorBackupCodes", {
    codeId: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("userId")
        .notNull()
        .references(() => users.userId, { onDelete: "cascade" }),
    codeHash: text("codeHash").notNull(),
});

export const sessions = sqliteTable("session", {
    sessionId: text("id").primaryKey(),
    userId: text("userId")
        .notNull()
        .references(() => users.userId, { onDelete: "cascade" }),
    expiresAt: integer("expiresAt").notNull(),
});

export const userOrgs = sqliteTable("userOrgs", {
    userId: text("userId")
        .notNull()
        .references(() => users.userId),
    orgId: text("orgId")
        .notNull()
        .references(() => orgs.orgId),
    roleId: integer("roleId")
        .notNull()
        .references(() => roles.roleId),
});

export const emailVerificationCodes = sqliteTable("emailVerificationCodes", {
    codeId: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("userId")
        .notNull()
        .references(() => users.userId, { onDelete: "cascade" }),
    email: text("email").notNull(),
    code: text("code").notNull(),
    expiresAt: integer("expiresAt").notNull(),
});

export const passwordResetTokens = sqliteTable("passwordResetTokens", {
    tokenId: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("userId")
        .notNull()
        .references(() => users.userId, { onDelete: "cascade" }),
    tokenHash: text("tokenHash").notNull(),
    expiresAt: integer("expiresAt").notNull(),
});

export const actions = sqliteTable("actions", {
    actionId: text("actionId").primaryKey(),
    name: text("name"),
    description: text("description"),
});

export const roles = sqliteTable("roles", {
    roleId: integer("roleId").primaryKey({ autoIncrement: true }),
    orgId: text("orgId").references(() => orgs.orgId, {
        onDelete: "cascade",
    }),
    isSuperuserRole: integer("isSuperuserRole", { mode: "boolean" }),
    name: text("name").notNull(),
    description: text("description"),
});

export const roleActions = sqliteTable("roleActions", {
    roleId: integer("roleId")
        .notNull()
        .references(() => roles.roleId, { onDelete: "cascade" }),
    actionId: text("actionId")
        .notNull()
        .references(() => actions.actionId, { onDelete: "cascade" }),
    orgId: text("orgId")
        .notNull()
        .references(() => orgs.orgId, { onDelete: "cascade" }),
});

export const userActions = sqliteTable("userActions", {
    userId: text("userId")
        .notNull()
        .references(() => users.userId, { onDelete: "cascade" }),
    actionId: text("actionId")
        .notNull()
        .references(() => actions.actionId, { onDelete: "cascade" }),
    orgId: text("orgId")
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
        .references(() => users.userId, { onDelete: "cascade" }),
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
        .references(() => users.userId, { onDelete: "cascade" }),
    resourceId: text("resourceId")
        .notNull()
        .references(() => resources.resourceId, { onDelete: "cascade" }),
});

export const limitsTable = sqliteTable("limits", {
    limitId: integer("limitId").primaryKey({ autoIncrement: true }),
    orgId: text("orgId").references(() => orgs.orgId, {
        onDelete: "cascade",
    }),
    name: text("name").notNull(),
    value: integer("value").notNull(),
    description: text("description"),
});

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
export type Limit = InferSelectModel<typeof limitsTable>;
