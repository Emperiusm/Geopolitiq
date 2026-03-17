import { MongoClient, type Db } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(uri?: string): Promise<Db> {
  const mongoUri = uri ?? process.env.MONGO_URI ?? "mongodb://localhost:27017/gambit";
  client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db();
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error("MongoDB not connected. Call connectMongo() first.");
  return db;
}

export function getClient(): MongoClient {
  if (!client) throw new Error("MongoDB not connected. Call connectMongo() first.");
  return client;
}

export async function disconnectMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
