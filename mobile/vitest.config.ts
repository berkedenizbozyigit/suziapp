import { defineConfig } from 'vitest/config';

// Unit tests run in plain Node against import-clean pure modules (no React Native
// or Supabase imports). Component/integration tests are out of scope here.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
