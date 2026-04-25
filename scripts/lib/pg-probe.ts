import { Client } from "pg";

export interface ProbeOk {
  ok: true;
}
export interface ProbeFail {
  ok: false;
  error: string;
}
export type ProbeResult = ProbeOk | ProbeFail;

/**
 * Try to open a Postgres connection and run `SELECT 1`. Disconnects
 * regardless of outcome. Times out at 2 seconds.
 */
export async function probePostgres(url: string): Promise<ProbeResult> {
  const client = new Client({
    connectionString: url,
    connectionTimeoutMillis: 2_000,
  });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await client.end().catch(() => {
      /* swallow — connection may never have been established */
    });
  }
}
