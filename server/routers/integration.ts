import * as site from "./site";
import * as org from "./org";
import * as resource from "./resource";
import * as domain from "./domain";
import * as target from "./target";
import * as user from "./user";
import * as role from "./role";
// import * as client from "./client";
import * as accessToken from "./accessToken";
import * as apiKeys from "./apiKeys";
import * as idp from "./idp";
import {
    verifyApiKey,
    verifyApiKeyOrgAccess,
    verifyApiKeyHasAction,
    verifyApiKeySiteAccess,
    verifyApiKeyResourceAccess,
    verifyApiKeyTargetAccess,
    verifyApiKeyRoleAccess,
    verifyApiKeyUserAccess,
    verifyApiKeySetResourceUsers,
    verifyApiKeyAccessTokenAccess,
    verifyApiKeyIsRoot
} from "@server/middlewares";
import HttpCode from "@server/types/HttpCode";
import { Router } from "express";
import { ActionsEnum } from "@server/auth/actions";

export const unauthenticated = Router();

unauthenticated.get("/", (_, res) => {
    res.status(HttpCode.OK).json({ message: "Healthy" });
});

export const authenticated = Router();
authenticated.use(verifyApiKey);

authenticated.get(
    "/org/checkId",
    verifyApiKeyIsRoot,
    verifyApiKeyHasAction(ActionsEnum.checkOrgId),
    org.checkId
);

authenticated.put(
    "/org",
    verifyApiKeyIsRoot,
    verifyApiKeyHasAction(ActionsEnum.createOrg),
    org.createOrg
);

authenticated.get(
    "/orgs",
    verifyApiKeyIsRoot,
    verifyApiKeyHasAction(ActionsEnum.listOrgs),
    org.listOrgs
); // TODO we need to check the orgs here

authenticated.get(
    "/org/:orgId",
    verifyApiKeyOrgAccess,
    verifyApiKeyHasAction(ActionsEnum.getOrg),
    org.getOrg
);

authenticated.post(
    "/org/:orgId",
    verifyApiKeyOrgAccess,
    verifyApiKeyHasAction(ActionsEnum.updateOrg),
    org.updateOrg
);

authenticated.delete(
    "/org/:orgId",
    verifyApiKeyIsRoot,
    verifyApiKeyHasAction(ActionsEnum.deleteOrg),
    org.deleteOrg
);

authenticated.put(
    "/org/:orgId/site",
    verifyApiKeyOrgAccess,
    verifyApiKeyHasAction(ActionsEnum.createSite),
    site.createSite
);

authenticated.get(
    "/org/:orgId/sites",
    verifyApiKeyOrgAccess,
    verifyApiKeyHasAction(ActionsEnum.listSites),
    site.listSites
);

authenticated.get(
    "/org/:orgId/site/:niceId",
    verifyApiKeyOrgAccess,
    verifyApiKeyHasAction(ActionsEnum.getSite),
    site.getSite
);

authenticated.get(
    "/org/:orgId/pick-site-defaults",
    verifyApiKeyOrgAccess,
    verifyApiKeyHasAction(ActionsEnum.createSite),
    site.pickSiteDefaults
);

authenticated.get(
    "/site/:siteId",
    verifyApiKeySiteAccess,
    verifyApiKeyHasAction(ActionsEnum.getSite),
    site.getSite
);

authenticated.post(
    "/site/:siteId",
    verifyApiKeySiteAccess,
    verifyApiKeyHasAction(ActionsEnum.updateSite),
    site.updateSite
);

authenticated.delete(
    "/site/:siteId",
    verifyApiKeySiteAccess,
    verifyApiKeyHasAction(ActionsEnum.deleteSite),
    site.deleteSite
);

authenticated.put(
    "/org/:orgId/site/:siteId/resource",
    verifyApiKeyOrgAccess,
    verifyApiKeyHasAction(ActionsEnum.createResource),
    resource.createResource
);

authenticated.get(
    "/site/:siteId/resources",
    verifyApiKeySiteAccess,
    verifyApiKeyHasAction(ActionsEnum.listResources),
    resource.listResources
);

authenticated.get(
    "/org/:orgId/resources",
    verifyApiKeyOrgAccess,
    verifyApiKeyHasAction(ActionsEnum.listResources),
    resource.listResources
);

authenticated.get(
    "/org/:orgId/domains",
    verifyApiKeyOrgAccess,
    verifyApiKeyHasAction(ActionsEnum.listOrgDomains),
    domain.listDomains
);

authenticated.post(
    "/org/:orgId/create-invite",
    verifyApiKeyOrgAccess,
    verifyApiKeyHasAction(ActionsEnum.inviteUser),
    user.inviteUser
);

authenticated.get(
    "/resource/:resourceId/roles",
    verifyApiKeyResourceAccess,
    verifyApiKeyHasAction(ActionsEnum.listResourceRoles),
    resource.listResourceRoles
);

authenticated.get(
    "/resource/:resourceId/users",
    verifyApiKeyResourceAccess,
    verifyApiKeyHasAction(ActionsEnum.listResourceUsers),
    resource.listResourceUsers
);

authenticated.get(
    "/resource/:resourceId",
    verifyApiKeyResourceAccess,
    verifyApiKeyHasAction(ActionsEnum.getResource),
    resource.getResource
);

authenticated.post(
    "/resource/:resourceId",
    verifyApiKeyResourceAccess,
    verifyApiKeyHasAction(ActionsEnum.updateResource),
    resource.updateResource
);

authenticated.delete(
    "/resource/:resourceId",
    verifyApiKeyResourceAccess,
    verifyApiKeyHasAction(ActionsEnum.deleteResource),
    resource.deleteResource
);

authenticated.put(
    "/resource/:resourceId/target",
    verifyApiKeyResourceAccess,
    verifyApiKeyHasAction(ActionsEnum.createTarget),
    target.createTarget
);

authenticated.get(
    "/resource/:resourceId/targets",
    verifyApiKeyResourceAccess,
    verifyApiKeyHasAction(ActionsEnum.listTargets),
    target.listTargets
);

authenticated.put(
    "/resource/:resourceId/rule",
    verifyApiKeyResourceAccess,
    verifyApiKeyHasAction(ActionsEnum.createResourceRule),
    resource.createResourceRule
);

authenticated.get(
    "/resource/:resourceId/rules",
    verifyApiKeyResourceAccess,
    verifyApiKeyHasAction(ActionsEnum.listResourceRules),
    resource.listResourceRules
);

authenticated.post(
    "/resource/:resourceId/rule/:ruleId",
    verifyApiKeyResourceAccess,
    verifyApiKeyHasAction(ActionsEnum.updateResourceRule),
    resource.updateResourceRule
);

authenticated.delete(
    "/resource/:resourceId/rule/:ruleId",
    verifyApiKeyResourceAccess,
    verifyApiKeyHasAction(ActionsEnum.deleteResourceRule),
    resource.deleteResourceRule
);

authenticated.get(
    "/target/:targetId",
    verifyApiKeyTargetAccess,
    verifyApiKeyHasAction(ActionsEnum.getTarget),
    target.getTarget
);

authenticated.post(
    "/target/:targetId",
    verifyApiKeyTargetAccess,
    verifyApiKeyHasAction(ActionsEnum.updateTarget),
    target.updateTarget
);

authenticated.delete(
    "/target/:targetId",
    verifyApiKeyTargetAccess,
    verifyApiKeyHasAction(ActionsEnum.deleteTarget),
    target.deleteTarget
);

authenticated.put(
    "/org/:orgId/role",
    verifyApiKeyOrgAccess,
    verifyApiKeyHasAction(ActionsEnum.createRole),
    role.createRole
);

authenticated.get(
    "/org/:orgId/roles",
    verifyApiKeyOrgAccess,
    verifyApiKeyHasAction(ActionsEnum.listRoles),
    role.listRoles
);

authenticated.delete(
    "/role/:roleId",
    verifyApiKeyRoleAccess,
    verifyApiKeyHasAction(ActionsEnum.deleteRole),
    role.deleteRole
);

authenticated.get(
    "/role/:roleId",
    verifyApiKeyRoleAccess,
    verifyApiKeyHasAction(ActionsEnum.getRole),
    role.getRole
);

authenticated.post(
    "/role/:roleId/add/:userId",
    verifyApiKeyRoleAccess,
    verifyApiKeyUserAccess,
    verifyApiKeyHasAction(ActionsEnum.addUserRole),
    user.addUserRole
);

authenticated.post(
    "/resource/:resourceId/roles",
    verifyApiKeyResourceAccess,
    verifyApiKeyRoleAccess,
    verifyApiKeyHasAction(ActionsEnum.setResourceRoles),
    resource.setResourceRoles
);

authenticated.post(
    "/resource/:resourceId/users",
    verifyApiKeyResourceAccess,
    verifyApiKeySetResourceUsers,
    verifyApiKeyHasAction(ActionsEnum.setResourceUsers),
    resource.setResourceUsers
);

authenticated.post(
    `/resource/:resourceId/password`,
    verifyApiKeyResourceAccess,
    verifyApiKeyHasAction(ActionsEnum.setResourcePassword),
    resource.setResourcePassword
);

authenticated.post(
    `/resource/:resourceId/pincode`,
    verifyApiKeyResourceAccess,
    verifyApiKeyHasAction(ActionsEnum.setResourcePincode),
    resource.setResourcePincode
);

authenticated.post(
    `/resource/:resourceId/whitelist`,
    verifyApiKeyResourceAccess,
    verifyApiKeyHasAction(ActionsEnum.setResourceWhitelist),
    resource.setResourceWhitelist
);

authenticated.get(
    `/resource/:resourceId/whitelist`,
    verifyApiKeyResourceAccess,
    verifyApiKeyHasAction(ActionsEnum.getResourceWhitelist),
    resource.getResourceWhitelist
);

authenticated.post(
    `/resource/:resourceId/transfer`,
    verifyApiKeyResourceAccess,
    verifyApiKeyHasAction(ActionsEnum.updateResource),
    resource.transferResource
);

authenticated.post(
    `/resource/:resourceId/access-token`,
    verifyApiKeyResourceAccess,
    verifyApiKeyHasAction(ActionsEnum.generateAccessToken),
    accessToken.generateAccessToken
);

authenticated.delete(
    `/access-token/:accessTokenId`,
    verifyApiKeyAccessTokenAccess,
    verifyApiKeyHasAction(ActionsEnum.deleteAcessToken),
    accessToken.deleteAccessToken
);

authenticated.get(
    `/org/:orgId/access-tokens`,
    verifyApiKeyOrgAccess,
    verifyApiKeyHasAction(ActionsEnum.listAccessTokens),
    accessToken.listAccessTokens
);

authenticated.get(
    `/resource/:resourceId/access-tokens`,
    verifyApiKeyResourceAccess,
    verifyApiKeyHasAction(ActionsEnum.listAccessTokens),
    accessToken.listAccessTokens
);

authenticated.get(
    "/org/:orgId/user/:userId",
    verifyApiKeyOrgAccess,
    verifyApiKeyHasAction(ActionsEnum.getOrgUser),
    user.getOrgUser
);

authenticated.get(
    "/org/:orgId/users",
    verifyApiKeyOrgAccess,
    verifyApiKeyHasAction(ActionsEnum.listUsers),
    user.listUsers
);

authenticated.delete(
    "/org/:orgId/user/:userId",
    verifyApiKeyOrgAccess,
    verifyApiKeyUserAccess,
    verifyApiKeyHasAction(ActionsEnum.removeUser),
    user.removeUserOrg
);

// authenticated.put(
//     "/newt",
//     verifyApiKeyHasAction(ActionsEnum.createNewt),
//     newt.createNewt
// );

authenticated.get(
    `/org/:orgId/api-keys`,
    verifyApiKeyIsRoot,
    verifyApiKeyHasAction(ActionsEnum.listApiKeys),
    apiKeys.listOrgApiKeys
);

authenticated.post(
    `/org/:orgId/api-key/:apiKeyId/actions`,
    verifyApiKeyIsRoot,
    verifyApiKeyHasAction(ActionsEnum.setApiKeyActions),
    apiKeys.setApiKeyActions
);

authenticated.get(
    `/org/:orgId/api-key/:apiKeyId/actions`,
    verifyApiKeyIsRoot,
    verifyApiKeyHasAction(ActionsEnum.listApiKeyActions),
    apiKeys.listApiKeyActions
);

authenticated.put(
    `/org/:orgId/api-key`,
    verifyApiKeyIsRoot,
    verifyApiKeyHasAction(ActionsEnum.createApiKey),
    apiKeys.createOrgApiKey
);

authenticated.delete(
    `/org/:orgId/api-key/:apiKeyId`,
    verifyApiKeyIsRoot,
    verifyApiKeyHasAction(ActionsEnum.deleteApiKey),
    apiKeys.deleteApiKey
);

authenticated.put(
    "/idp/oidc",
    verifyApiKeyIsRoot,
    verifyApiKeyHasAction(ActionsEnum.createIdp),
    idp.createOidcIdp
);

authenticated.post(
    "/idp/:idpId/oidc",
    verifyApiKeyIsRoot,
    verifyApiKeyHasAction(ActionsEnum.updateIdp),
    idp.updateOidcIdp
);

authenticated.delete(
    "/idp/:idpId",
    verifyApiKeyIsRoot,
    verifyApiKeyHasAction(ActionsEnum.deleteIdp),
    idp.deleteIdp
);

authenticated.get(
    "/idp",
    verifyApiKeyIsRoot,
    verifyApiKeyHasAction(ActionsEnum.listIdps),
    idp.listIdps
);

authenticated.get(
    "/idp/:idpId",
    verifyApiKeyIsRoot,
    verifyApiKeyHasAction(ActionsEnum.getIdp),
    idp.getIdp
);

authenticated.put(
    "/idp/:idpId/org/:orgId",
    verifyApiKeyIsRoot,
    verifyApiKeyHasAction(ActionsEnum.createIdpOrg),
    idp.createIdpOrgPolicy
);

authenticated.post(
    "/idp/:idpId/org/:orgId",
    verifyApiKeyIsRoot,
    verifyApiKeyHasAction(ActionsEnum.updateIdpOrg),
    idp.updateIdpOrgPolicy
);

authenticated.delete(
    "/idp/:idpId/org/:orgId",
    verifyApiKeyIsRoot,
    verifyApiKeyHasAction(ActionsEnum.deleteIdpOrg),
    idp.deleteIdpOrgPolicy
);

authenticated.get(
    "/idp/:idpId/org",
    verifyApiKeyIsRoot,
    verifyApiKeyHasAction(ActionsEnum.listIdpOrgs),
    idp.listIdpOrgPolicies
);
