import { neon } from '@neondatabase/serverless';
import type { AppEnv } from './env.js';
import { getConnectionUri, listBucketObjects, listBuckets } from './neon-client.js';
import { asArray, asNumber, asRecord, asString } from './json.js';
import { errorMessage } from './util.js';

export interface TableInfo {
  name: string;
  columns: number;
  rows: number;
}

export interface StorageObject {
  key: string;
  size: number;
  lastModified: string;
}

export interface BucketView {
  name: string;
  objects: StorageObject[];
}

export interface DatabaseInspection {
  tables: TableInfo[];
  error: string | null;
}

export interface StorageInspection {
  buckets: BucketView[];
  storageEnabled: boolean;
  error: string | null;
}

function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export async function inspectDatabase(
  env: AppEnv,
  branchId: string,
): Promise<DatabaseInspection> {
  try {
    const uri = await getConnectionUri(env, branchId);
    const sql = neon(uri);

    const columnRows = await sql`
      select table_name, count(*)::int as columns
      from information_schema.columns
      where table_schema = 'public'
      group by table_name
      order by table_name`;

    const columnsByName = new Map<string, number>();
    for (const row of asArray(columnRows, 'column rows')) {
      const record = asRecord(row, 'column row');
      columnsByName.set(
        asString(record.table_name, 'table_name'),
        asNumber(record.columns, 'columns'),
      );
    }

    const names = [...columnsByName.keys()];
    const rowCounts = new Map<string, number>();
    if (names.length > 0) {
      const union = names
        .map(
          (name) =>
            `select ${quoteLiteral(name)}::text as t, count(*)::int as c from ${quoteIdentifier(name)}`,
        )
        .join(' union all ');
      const countRows = await sql.query(union);
      for (const row of asArray(countRows, 'count rows')) {
        const record = asRecord(row, 'count row');
        rowCounts.set(asString(record.t, 't'), asNumber(record.c, 'c'));
      }
    }

    const tables: TableInfo[] = names.map((name) => ({
      name,
      columns: columnsByName.get(name) ?? 0,
      rows: rowCounts.get(name) ?? 0,
    }));

    return { tables, error: null };
  } catch (err) {
    return { tables: [], error: errorMessage(err) };
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
