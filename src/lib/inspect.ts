import { neon } from '@neondatabase/serverless';
import type { AppEnv } from './env.js';
import { getConnectionUri, listBucketObjects, listBuckets } from './neon-client.js';
import { asArray, asNumber, asRecord, asString } from './json.js';
import { errorMessage } from './util.js';
import { formatCell, quoteIdentifier } from './sql.js';

export const TABLE_ROW_LIMIT = 50;

export interface StorageObject {
  key: string;
  size: number;
  lastModified: string;
}

export interface BucketView {
  name: string;
  objects: StorageObject[];
}

export interface DatabaseTables {
  tables: TableDetail[];
  error: string | null;
}

export interface StorageInspection {
  buckets: BucketView[];
  storageEnabled: boolean;
  error: string | null;
}

export interface TableDetail {
  name: string;
  columns: string[];
  primaryKey: string | null;
  rowCount: number;
  rows: Array<Record<string, string>>;
  truncated: boolean;
  error: string | null;
}

async function listTableNames(env: AppEnv, branchId: string): Promise<string[]> {
  const uri = await getConnectionUri(env, branchId);
  const sql = neon(uri);
  const rows = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name`;
  return asArray(rows, 'tables').map((row) =>
    asString(asRecord(row, 'table').table_name, 'table_name'),
  );
}

/** Full inspection: every public table with its columns, row count, and rows. */
export async function inspectDatabaseFull(
  env: AppEnv,
  branchId: string,
): Promise<DatabaseTables> {
  try {
    const names = await listTableNames(env, branchId);
    const tables: TableDetail[] = [];
    for (const name of names) {
      tables.push(await getTableDetail(env, branchId, name));
    }
    return { tables, error: null };
  } catch (err) {
    return { tables: [], error: errorMessage(err) };
  }
}

/** Resolve a table's column list + single-column primary key, validating it exists. */
export async function describeTable(
  env: AppEnv,
  branchId: string,
  tableName: string,
): Promise<{ columns: string[]; primaryKey: string | null }> {
  const uri = await getConnectionUri(env, branchId);
  const sql = neon(uri);

  const columnRows = await sql`
    select column_name
    from information_schema.columns
    where table_schema = 'public' and table_name = ${tableName}
    order by ordinal_position`;
  const columns = asArray(columnRows, 'columns').map((row) =>
    asString(asRecord(row, 'column').column_name, 'column_name'),
  );
  if (columns.length === 0) {
    throw new Error(`Table "${tableName}" was not found in the public schema.`);
  }

  const pkRows = await sql`
    select a.attname as col
    from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
    where i.indrelid = ${`public.${quoteIdentifier(tableName)}`}::regclass
      and i.indisprimary`;
  const pkColumns = asArray(pkRows, 'pk').map((row) =>
    asString(asRecord(row, 'pk').col, 'col'),
  );

  return { columns, primaryKey: pkColumns.length === 1 ? (pkColumns[0] ?? null) : null };
}

export async function getTableDetail(
  env: AppEnv,
  branchId: string,
  tableName: string,
): Promise<TableDetail> {
  try {
    const { columns, primaryKey } = await describeTable(env, branchId, tableName);
    const uri = await getConnectionUri(env, branchId);
    const sql = neon(uri);

    const countRows = await sql.query(
      `select count(*)::int as c from ${quoteIdentifier(tableName)}`,
    );
    const rowCount = asNumber(
      asRecord(asArray(countRows, 'count')[0] ?? {}, 'count row').c,
      'count',
    );

    const dataRows = await sql.query(
      `select * from ${quoteIdentifier(tableName)} limit ${TABLE_ROW_LIMIT}`,
    );
    const rows = asArray(dataRows, 'rows').map((row) => {
      const record = asRecord(row, 'data row');
      const out: Record<string, string> = {};
      for (const column of columns) {
        out[column] = formatCell(record[column]);
      }
      return out;
    });

    return {
      name: tableName,
      columns,
      primaryKey,
      rowCount,
      rows,
      truncated: rowCount > rows.length,
      error: null,
    };
  } catch (err) {
    return {
      name: tableName,
      columns: [],
      primaryKey: null,
      rowCount: 0,
      rows: [],
      truncated: false,
      error: errorMessage(err),
    };
  }
}

export async function inspectStorage(
  env: AppEnv,
  branchId: string,
): Promise<StorageInspection> {
  try {
    const buckets = await listBuckets(env, branchId);
    const views: BucketView[] = [];
    for (const bucket of buckets) {
      const objects = await listBucketObjects(env, branchId, bucket.name);
      views.push({
        name: bucket.name,
        objects: objects.map((object) => ({
          key: object.key,
          size: object.size,
          lastModified: object.lastModified,
        })),
      });
    }
    return { buckets: views, storageEnabled: true, error: null };
  } catch (err) {
    return { buckets: [], storageEnabled: false, error: errorMessage(err) };
  }
}
