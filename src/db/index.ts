import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

// prepare:false é recomendado ao usar a Transaction Pooler do Supabase (modo transação).
const client = postgres(env.DATABASE_URL, { prepare: false });

export const db = drizzle(client, { schema });
export { client };
