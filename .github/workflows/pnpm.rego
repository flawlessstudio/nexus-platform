package main

deny[msg] {
    input.packageManager != "pnpm@8"
    msg := sprintf("Root package.json must use pnpm@8, but found '%s'", [input.packageManager])
}
