import { createHash } from "crypto";
import type { Client } from "@libsql/client/web";

let schemaReady: Promise<void> | null = null;

export type SubscriberStatus = "pending" | "active" | "unsubscribed" | "suppressed";

export interface SubscriberRow {
  email: string;
  status: SubscriberStatus;
  confirm_token_hash: string | null;
  confirm_token_expires_at: string | null;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
  suppressed_at: string | null;
  suppression_reason: string | null;
}

function normalizeStatus(value: unknown): SubscriberStatus {
  if (value === "active" || value === "unsubscribed" || value === "suppressed" || value === "pending") {
    return value;
  }
  return "pending";
}

export async function ensureSubscribersSchema(db: Client) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS subscribers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          confirmed BOOLEAN DEFAULT FALSE,
          status TEXT DEFAULT 'pending',
          confirm_token_hash TEXT,
          confirm_token_expires_at DATETIME,
          confirmed_at DATETIME,
          unsubscribed_at DATETIME,
          suppressed_at DATETIME,
          suppression_reason TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const tableInfo = await db.execute("PRAGMA table_info(subscribers)");
      const columns = new Set(tableInfo.rows.map((row) => String(row.name)));

      const alterStatements: string[] = [];
      if (!columns.has("subscribed_at")) {
        alterStatements.push("ALTER TABLE subscribers ADD COLUMN subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP");
      }
      if (!columns.has("confirmed")) {
        alterStatements.push("ALTER TABLE subscribers ADD COLUMN confirmed BOOLEAN DEFAULT FALSE");
      }
      if (!columns.has("status")) {
        alterStatements.push("ALTER TABLE subscribers ADD COLUMN status TEXT DEFAULT 'pending'");
      }
      if (!columns.has("confirm_token_hash")) {
        alterStatements.push("ALTER TABLE subscribers ADD COLUMN confirm_token_hash TEXT");
      }
      if (!columns.has("confirm_token_expires_at")) {
        alterStatements.push("ALTER TABLE subscribers ADD COLUMN confirm_token_expires_at DATETIME");
      }
      if (!columns.has("confirmed_at")) {
        alterStatements.push("ALTER TABLE subscribers ADD COLUMN confirmed_at DATETIME");
      }
      if (!columns.has("suppressed_at")) {
        alterStatements.push("ALTER TABLE subscribers ADD COLUMN suppressed_at DATETIME");
      }
      if (!columns.has("suppression_reason")) {
        alterStatements.push("ALTER TABLE subscribers ADD COLUMN suppression_reason TEXT");
      }
      if (!columns.has("created_at")) {
        alterStatements.push("ALTER TABLE subscribers ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
      }
      if (!columns.has("updated_at")) {
        alterStatements.push("ALTER TABLE subscribers ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP");
      }

      for (const sql of alterStatements) {
        await db.execute(sql);
      }

      await db.execute(`
        UPDATE subscribers
        SET created_at = COALESCE(created_at, subscribed_at, CURRENT_TIMESTAMP)
        WHERE created_at IS NULL
      `);

      await db.execute(`
        UPDATE subscribers
        SET updated_at = COALESCE(updated_at, subscribed_at, created_at, CURRENT_TIMESTAMP)
        WHERE updated_at IS NULL
      `);

      await db.execute(`
        UPDATE subscribers
        SET confirmed_at = COALESCE(confirmed_at, subscribed_at, created_at, CURRENT_TIMESTAMP)
        WHERE confirmed = 1 AND confirmed_at IS NULL
      `);

      await db.execute(`
        UPDATE subscribers
        SET status = CASE
          WHEN suppressed_at IS NOT NULL THEN 'suppressed'
          WHEN unsubscribed_at IS NOT NULL THEN 'unsubscribed'
          WHEN confirmed_at IS NOT NULL OR confirmed = 1 THEN 'active'
          WHEN confirm_token_hash IS NULL AND unsubscribed_at IS NULL THEN 'active'
          ELSE COALESCE(status, 'pending')
        END
        WHERE status IS NULL OR status = '' OR status NOT IN ('pending', 'active', 'unsubscribed', 'suppressed')
      `);
    })();
  }

  await schemaReady;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getSubscriberByEmail(db: Client, email: string): Promise<SubscriberRow | null> {
  const result = await db.execute({
    sql: `
      SELECT
        email,
        status,
        confirm_token_hash,
        confirm_token_expires_at,
        confirmed_at,
        unsubscribed_at,
        suppressed_at,
        suppression_reason
      FROM subscribers
      WHERE email = ?
      LIMIT 1
    `,
    args: [email],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    email: String(row.email),
    status: normalizeStatus(row.status),
    confirm_token_hash: row.confirm_token_hash ? String(row.confirm_token_hash) : null,
    confirm_token_expires_at: row.confirm_token_expires_at ? String(row.confirm_token_expires_at) : null,
    confirmed_at: row.confirmed_at ? String(row.confirmed_at) : null,
    unsubscribed_at: row.unsubscribed_at ? String(row.unsubscribed_at) : null,
    suppressed_at: row.suppressed_at ? String(row.suppressed_at) : null,
    suppression_reason: row.suppression_reason ? String(row.suppression_reason) : null,
  };
}
