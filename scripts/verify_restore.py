"""Compare a fresh backup restore against the live database without printing rows."""
import hashlib
import json
import os
from pathlib import Path
import sys

import psycopg
from psycopg import sql
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / '.env', override=False)
if len(sys.argv) != 2 or not sys.argv[1].startswith('campus_restore_'):
    raise SystemExit('Usage: python scripts/verify_restore.py campus_restore_name')


def fingerprint(database):
    result = {}
    with psycopg.connect(dbname=database) as connection:
        tables = connection.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name"
        ).fetchall()
        for (table,) in tables:
            rows = connection.execute(sql.SQL('SELECT row_to_json(t)::text FROM {} t').format(sql.Identifier(table))).fetchall()
            values = sorted(row[0] for row in rows)
            digest = hashlib.sha256(json.dumps(values, ensure_ascii=False).encode()).hexdigest()
            result[table] = {'rows': len(values), 'sha256': digest}
    return result


live = fingerprint(os.environ['PGDATABASE'])
restored = fingerprint(sys.argv[1])
if live != restored:
    mismatches = sorted(table for table in set(live) | set(restored) if live.get(table) != restored.get(table))
    print('Restore differs for tables:', ', '.join(mismatches))
    raise SystemExit(1)
print(f'Restore verified: all {len(live)} tables and {sum(t["rows"] for t in live.values())} rows match by content hash.')
