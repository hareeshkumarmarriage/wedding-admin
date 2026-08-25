import { test, expect } from "@playwright/test";
test("homepage loads", async ({ page }) => { await page.goto("/"); await expect(page).toHaveTitle(/Wedding|Hareesh|Prasanna/i); });
test("protected admin route renders login", async ({ page }) => { await page.goto("/admin"); await expect(page.getByText(/Control Center|Admin|Sign in|Login/i).first()).toBeVisible(); });
