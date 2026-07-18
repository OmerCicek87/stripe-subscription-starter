// Deterministic env for the test suite. Set BEFORE any module under test is
// imported (setupFiles runs first), because lib/stripe/client.ts and the
// service client read these at import time.

process.env.NEXT_PUBLIC_APP_URL = "https://app.test";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.test";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-test";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
process.env.STRIPE_PRICE_PRO_MONTHLY = "price_monthly_env";
process.env.STRIPE_PRICE_PRO_YEARLY = "price_yearly_env";
