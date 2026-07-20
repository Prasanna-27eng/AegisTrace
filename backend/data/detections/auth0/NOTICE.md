This directory vendors detection rules verbatim from:

    https://github.com/auth0/auth0-customer-detections

Copyright © 2025, Okta, Inc. Licensed under the Apache License, Version 2.0
(see `LICENSE` in this directory). Files are unmodified from upstream.

These are identity-platform detection rules in Sigma format, imported into
AegisTrace's `DetectionRule` table by `backend/scripts/import_detections.py`
with `status="imported"` and a `[auth0]` prefix on `rule_name` for provenance.
