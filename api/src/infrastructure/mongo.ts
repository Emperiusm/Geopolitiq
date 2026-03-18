import { MongoClient, type Db, type Collection, type Document } from "mongodb";

/** Base document type that uses string _id (matches our domain types) */
export interface StringIdDocument extends Document {
  _id?: string;
}

/** Typed Db wrapper that defaults .collection() to StringIdDocument */
export interface GameDb extends Db {
  collection<T extends Document = StringIdDocument>(name: string): Collection<T>;
}

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(uri?: string): Promise<GameDb> {
  const mongoUri = uri ?? process.env.MONGO_URI ?? "mongodb://localhost:27017/gambit";
  client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db();
  return db as unknown as GameDb;
}

export function getDb(): GameDb {
  if (!db) throw new Error("MongoDB not connected. Call connectMongo() first.");
  return db as unknown as GameDb;
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
