import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { orgs, users, sites, resources, exitNodes, routes, targets } from '../server/db/schema';

const sqlite = new Database('./config/db/db.sqlite');
const db = drizzle(sqlite);

async function insertDummyData() {
  // Insert dummy orgs
  const org1 = await db.insert(orgs).values({
    name: 'Fosrl',
    domain: 'fosrl.io'
  }).returning().get();

  const org2 = await db.insert(orgs).values({
    name: 'Fossorial',
    domain: 'fossorial.io'
  }).returning().get();

  // Insert dummy users
  await db.insert(users).values([
    { orgId: org1.orgId, name: 'John Doe', email: 'john@fossorial.com', groups: 'admin,developer' },
    { orgId: org1.orgId, name: 'Jane Smith', email: 'jane@fossorial.com', groups: 'developer' },
    { orgId: org2.orgId, name: 'Bob Johnson', email: 'bob@fosrl.io', groups: 'admin' }
  ]);

  // Insert dummy exit nodes
  const exitNode1 = await db.insert(exitNodes).values({
    name: 'Exit Node 1',
    address: '192.168.1.1'
  }).returning().get();

  const exitNode2 = await db.insert(exitNodes).values({
    name: 'Exit Node 2',
    address: '192.168.1.2'
  }).returning().get();

  // Insert dummy sites
  const site1 = await db.insert(sites).values({
    orgId: org1.orgId,
    exitNode: exitNode1.exitNodeId,
    name: 'Main Site',
    subdomain: 'main',
    pubKey: 'abc123',
    subnet: '10.0.0.0/24'
  }).returning().get();

  const site2 = await db.insert(sites).values({
    orgId: org2.orgId,
    exitNode: exitNode2.exitNodeId,
    name: 'Dev Site',
    subdomain: 'dev',
    pubKey: 'def456',
    subnet: '10.0.1.0/24'
  }).returning().get();

  // Insert dummy resources
  const resource1 = await db.insert(resources).values({
    siteId: site1.siteId,
    name: 'Web Server',
    subdomain: 'web'
  }).returning().get();

  const resource2 = await db.insert(resources).values({
    siteId: site2.siteId,
    name: 'Database',
    subdomain: 'db'
  }).returning().get();

  // Insert dummy routes
  await db.insert(routes).values([
    { exitNodeId: exitNode1.exitNodeId, subnet: '192.168.0.0/24' },
    { exitNodeId: exitNode2.exitNodeId, subnet: '172.16.0.0/24' }
  ]);

  // Insert dummy targets
  await db.insert(targets).values([
    { resourceId: resource1.resourceId, ip: '10.0.0.10', method: 'GET', port: 80, protocol: 'http' },
    { resourceId: resource2.resourceId, ip: '10.0.1.20', method: 'TCP', port: 5432, protocol: 'postgresql' }
  ]);

  console.log('Dummy data inserted successfully');
}

insertDummyData().catch(console.error);