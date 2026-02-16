import { createClient } from "@libsql/client/web";

let dbClient: ReturnType<typeof createClient> | null = null;

export function getDbClient() {
  const url = process.env.TURSO_DATABASE_URL;

  if (!url) {
    throw new Error("Missing required environment variable: TURSO_DATABASE_URL");
  }

  if (!dbClient) {
    dbClient = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  return dbClient;
}
