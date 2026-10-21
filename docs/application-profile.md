# Application profile storage

Issue #42 is the first slice of #20. The profile and correction UI proposals are
in [the editable Pen design](../design/job-scout.pen), with
[profile](../design/profile-overview.png) and [edit](../design/profile-edit.png)
previews. #43 adds original-file retention and extraction evidence; #44 adds
verified editing and UI. This slice adds no verification endpoint or form filling.

`working-memory.json` now has `storeVersion: 1` and an `applicationProfile` with
its own schema version. Facts have stable IDs, section, key, value, verification
and provenance. Resume provenance records opaque resume IDs and half-open UTF-16
text offsets; #43 must bind and validate offsets against the retained source.
User provenance records the explicit entry time. Legacy provenance makes no
claim about where a value came from. These types are storage metadata, not
permission to fill a form or proof that a claim is true.

Unversioned files migrate in memory on read and are persisted on the next write.
Existing resume text, profile fields and saved Optimize content stay available
through the existing read/write functions. Legacy facts remain unverified:
the old store cannot distinguish extraction from user edits. Legacy callers
refresh only legacy facts on write; user/resume facts remain separate. Personal
declarations require explicit user provenance. The future editing API owns
verification, source binding and reconciliation with legacy fields.

Writes validate first, write and sync a private temporary file, then rename it
over the store. A failed replacement leaves the previous file intact. Only a
missing file produces an empty profile; corrupted, inaccessible and unsupported
stores fail without being overwritten. This is single-process local JSON storage,
not a multi-writer database: atomic replacement prevents partial files but does
not resolve concurrent read-modify-write conflicts. A transactional update API
is needed before adding concurrent profile editing.
