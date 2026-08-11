import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export function createDatabase(source = process.env.DATABASE_URL) {
  const value = source;
  if (!value)
    throw new Error("DATABASE_URL is required for durable ChaosKit evidence.");
  const client = postgres(value, { max: 1 });
  return { client, db: drizzle({ client }) };
}
