# Health Checks

- Doctors CI runs v1/v2/v3 doctors on PRs and pushes to `main`.
- Local run: `pnpm doctors`.
- Guardians policy: only `tools/v1_guardian.mjs` applies changes; `tools/v3_guardian.mjs` delegates to v1; v2 guardian is disabled in scripts.

Links
- Workflow: .github/workflows/doctors.yml
- Tools: tools/v1_doctor.mjs, tools/v2_doctor.mjs, tools/v3_doctor.mjs
