#!/usr/bin/env bash
# NEXUS Platform - Quick Env Check (v2)
# Purpose: fast, portable sanity check for critical .env variables.

set -e

GREEN="\033[1;32m"
YELLOW="\033[1;33m"
RED="\033[1;31m"
RESET="\033[0m"

echo -e "${YELLOW}→ Checking frontend envs...${RESET}"

if [ ! -f web/.env ]; then
  echo -e "${RED}✖ Missing web/.env${RESET}"
  exit 1
fi

missing=0

grep -q 'VITE_SUPABASE_URL=' web/.env || { echo -e "${RED}✖ Missing VITE_SUPABASE_URL in web/.env${RESET}"; missing=1; }
grep -q 'VITE_SUPABASE_ANON_KEY=' web/.env || { echo -e "${RED}✖ Missing VITE_SUPABASE_ANON_KEY in web/.env${RESET}"; missing=1; }

# Optional but recommended
for VAR in \
  VITE_INTEGRATION_STRIPE \
  VITE_INTEGRATION_SUPABASE \
  VITE_INTEGRATION_OPENAI \
  VITE_INTEGRATION_SENTRY \
  VITE_INTEGRATION_TURNSTILE \
  VITE_INTEGRATION_OPENAPI \
  VITE_INTEGRATION_GDPR \
  VITE_TURNSTILE_SITE_KEY \
  VITE_SENTRY_DSN
do
  if grep -q "${VAR}=" web/.env; then
    echo -e "${GREEN}✔ Found ${VAR}${RESET}"
  else
    echo -e "${YELLOW}⚠ ${VAR} not defined (optional)${RESET}"
  fi
done

if [ $missing -eq 1 ]; then
  echo -e "${RED}❌ Fix missing frontend variables above.${RESET}"
  exit 1
else
  echo -e "${GREEN}✅ Frontend envs OK${RESET}"
fi

echo -e "${YELLOW}→ Checking backend envs...${RESET}"

if [ ! -f backend/.env ]; then
  echo -e "${YELLOW}⚠ Missing backend/.env (OK if not using backend locally)${RESET}"
else
  grep -q 'SUPABASE_URL=' backend/.env || echo -e "${YELLOW}⚠ Missing SUPABASE_URL in backend/.env${RESET}"
  grep -q 'SUPABASE_SERVICE_ROLE_KEY=' backend/.env || echo -e "${YELLOW}⚠ Missing SUPABASE_SERVICE_ROLE_KEY in backend/.env${RESET}"
  echo -e "${GREEN}✅ Backend envs checked${RESET}"
fi

echo -e "${GREEN}✔ All checks complete.${RESET}"
