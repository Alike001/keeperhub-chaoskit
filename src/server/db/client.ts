import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required for durable ChaosKit evidence.");
  return value;
}

const client = postgres(databaseUrl(), { max: 1 });
export const db = drizzle({ client });
