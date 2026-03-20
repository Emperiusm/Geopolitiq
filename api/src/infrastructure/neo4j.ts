import neo4j, { type Driver, type ManagedTransaction } from "neo4j-driver";

let driver: Driver | null = null;

export async function connectNeo4j(): Promise<void> {
  const uri = process.env.NEO4J_URI ?? "bolt://localhost:7687";
  const user = process.env.NEO4J_USER ?? "neo4j";
  const password = process.env.NEO4J_PASSWORD ?? "gambit-dev";

  driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 30_000,
  });

  await driver.verifyConnectivity();
  console.log(`[neo4j] connected to ${uri}`);
}

export function getDriver(): Driver {
  if (!driver) throw new Error("Neo4j not connected. Call connectNeo4j() first.");
  return driver;
}

export function isNeo4jConnected(): boolean {
  return driver !== null;
}

export async function readTx<T>(
  work: (tx: ManagedTransaction) => Promise<T>,
  db?: string
): Promise<T> {
  const session = getDriver().session({ database: db ?? "neo4j" });
  try {
    return await session.executeRead(work);
  } finally {
    await session.close();
  }
}

export async function writeTx<T>(
  work: (tx: ManagedTransaction) => Promise<T>,
  db?: string
): Promise<T> {
  const session = getDriver().session({ database: db ?? "neo4j" });
  try {
    return await session.executeWrite(work);
  } finally {
    await session.close();
  }
}

export async function closeNeo4j(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
    console.log("[neo4j] connection closed");
  }
}
