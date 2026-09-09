// Regenerates storybook.requires.ts from main.ts globs. Metro's
// withStorybook runs this automatically when STORYBOOK_ENABLED=true; the
// standalone script exists so typecheck and CI can refresh it too.
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { generate } = require('@storybook/react-native/scripts/generate');

generate({ configPath: dirname(fileURLToPath(import.meta.url)) });
