# Application profile storage

Issue #42 is the first slice of #20. The profile and correction UI proposals are
in [the editable Pen design](../design/job-scout.pen), with
[profile](../design/profile-overview.png) and [edit](../design/profile-edit.png)
previews. #43 adds original-file retention and extraction evidence; #44 adds
verified editing and UI. This slice adds no verification endpoint or form filling.

The shared memory model has `storeVersion: 1` and an `applicationProfile` with
its own schema version. Facts have stable IDs, section, key, value, verification
and provenance. Resume provenance records opaque resume IDs and half-open UTF-16
text offsets; #43 must bind and validate offsets against the retained source.
User provenance records the explicit entry time. Legacy provenance makes no
claim about where a value came from. These types are storage metadata, not
permission to fill a form or proof that a claim is true.

## SQLite storage and migration

`JOB_SCOUT_DATA_DIR` (default `.data/`) holds `job-scout.db`, opened locally with
`@libsql/client`; no cloud account or credentials are required. SQLite tables
separate the profile, resume metadata/source text, saved Optimize output and
ordered provenance facts. Flexible profile lists and individual fact records
use JSON columns; the database is not one serialized working-memory document.
`PRAGMA user_version` tracks database schema migrations independently of the
application-profile schema.

On first access, schema creation, JSON import, read-back validation and the
migration marker commit in one transaction. Both unversioned and version-1
`working-memory.json` files are accepted. The original file remains unchanged
as a backup and is ignored after migration succeeds. Corruption and unsupported
versions fail without replacing data; failed migrations roll back and can retry.
Existing Scout and Optimize callers keep using `readWorkingMemory` and
`writeWorkingMemory`. Legacy facts remain unverified, with no invented evidence.

Each operation closes its connection. Writes across all tables are atomic, and
in-process operations are serialized. Separate caller-level read/modify/write
operations can still overwrite concurrent edits; a transactional update API is
needed before adding concurrent profile editing. Original binary resume files
remain #43, which will store them under `resumes/` beside the database.

## Portable backup and restore

Run `npm run db:backup -- /absolute/path/job-scout-backup.db` after the app has
initialized its database. This uses SQLite `VACUUM INTO` to export a consistent
snapshot and refuses to overwrite an existing destination. New database and
backup files are private to the owner on Unix (0600); they are not encrypted.

To move or restore data, stop Job Scout, preserve the destination's existing data,
and copy the backup to `JOB_SCOUT_DATA_DIR/job-scout.db` in a fresh directory.
Restart with that directory. Once #43 lands, copy the corresponding `resumes/`
folder too. Do not sync a live database with generic file-sync tools or copy it
without its active journal/WAL state; sync the exported backup instead. Rolling
back to the JSON implementation uses the retained JSON, which will not include
edits made after the SQLite migration.
