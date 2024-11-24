import { orgs, sites, resources, exitNodes, targets } from "@server/db/schema";
// import db from "@server/db";
// import { createAdminRole } from "@server/db/ensureActions";

// async function insertDummyData() {
//     const org1 = db
//         .insert(orgs)
//         .values({
//             orgId: "fossorial",
//             name: "Fossorial",
//             domain: "fossorial.io",
//         })
//         .returning()
//         .get();

//     await createAdminRole(org1.orgId!);

//     // Insert dummy exit nodes
//     const exitNode1 = db
//         .insert(exitNodes)
//         .values({
//             name: "Exit Node 1",
//             address: "10.0.0.1/24",
//             publicKey: "sKQlCNErB2n+dV8eLp5Yw/avsjK/zkrxJE0n48hjb10=",
//             listenPort: 51820,
//             endpoint: "exitnode1.fossorial.io",
//         })
//         .returning()
//         .get();

//     // Insert dummy sites
//     const site1 = db
//         .insert(sites)
//         .values({
//             orgId: org1.orgId,

//             exitNodeId: exitNode1.exitNodeId,
//             name: "Main Site",
//             subdomain: "main",
//             pubKey: "Kn4eD0kvcTwjO//zqH/CtNVkMNdMiUkbqFxysEym2D8=",
//             subnet: "10.0.0.16/28",
//         })
//         .returning()
//         .get();

//     const site2 = db
//         .insert(sites)
//         .values({
//             orgId: org2.orgId,
//             exitNode: exitNode2.exitNodeId,
//             name: "Dev Site",
//             subdomain: "dev",
//             pubKey: "V329Uf/vhnBwYxAuT/ZlMZuLokHy5tug/sGsLfIMK1w=",
//             subnet: "172.16.1.16/28",
//         })
//         .returning()
//         .get();

//     // Insert dummy resources
//     const resource1 = db
//         .insert(resources)
//         .values({
//             resourceId: `web.${site1.subdomain}.${org1.domain}`,
//             siteId: site1.siteId,
//             orgId: site1.orgId,
//             name: "Web Server",
//             subdomain: "web",
//         })
//         .returning()
//         .get();

//     const resource2 = db
//         .insert(resources)
//         .values({
//             resourceId: `web2.${site1.subdomain}.${org1.domain}`,
//             siteId: site1.siteId,
//             orgId: site1.orgId,
//             name: "Web Server 2",
//             subdomain: "web2",
//         })
//         .returning()
//         .get();

//     const resource3 = db
//         .insert(resources)
//         .values({
//             resourceId: `db.${site2.subdomain}.${org2.domain}`,
//             siteId: site2.siteId,
//             orgId: site2.orgId,
//             name: "Database",
//             subdomain: "db",
//         })
//         .returning()
//         .get();

//     // Insert dummy routes
//     await db.insert(routes).values([
//         { exitNodeId: exitNode1.exitNodeId, subnet: "10.0.0.0/24" },
//         { exitNodeId: exitNode2.exitNodeId, subnet: "172.16.1.1/24" },
//     ]);

//     // Insert dummy targets
//     await db.insert(targets).values([
//         {
//             resourceId: resource1.resourceId,
//             ip: "10.0.0.16",
//             method: "http",
//             port: 4200,
//             protocol: "TCP",
//         },
//         {
//             resourceId: resource2.resourceId,
//             ip: "10.0.0.17",
//             method: "https",
//             port: 443,
//             protocol: "TCP",
//         },
//         {
//             resourceId: resource3.resourceId,
//             ip: "172.16.1.16",
//             method: "http",
//             port: 80,
//             protocol: "TCP",
//         },
//     ]);

//     console.log("Dummy data inserted successfully");
// }

// insertDummyData().catch(console.error);
