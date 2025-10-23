default: dev

dev:
	vercel dev

test:
	pnpm test

e2e:
	pnpm e2e

guard:
	node tools/v1_guardian.mjs --apply && node tools/v2_guardian.mjs && node tools/v3_guardian.mjs --apply

doctors:
	node tools/v1_doctor.mjs --report && node tools/v2_doctor.mjs --report && node tools/v3_doctor.mjs --report
