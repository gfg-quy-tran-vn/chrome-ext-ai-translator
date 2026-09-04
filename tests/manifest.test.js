import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('manifest grants only the extension capabilities and provider origins in scope', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../manifest.json', import.meta.url)),
  );

  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(
    [...manifest.permissions].sort(),
    ['contextMenus', 'sidePanel', 'storage'].sort(),
  );
  assert.deepEqual(
    [...manifest.host_permissions].sort(),
    [
      'https://api.openai.com/*',
      'https://generativelanguage.googleapis.com/*',
    ].sort(),
  );
  assert.deepEqual(manifest.background, {
    service_worker: 'src/background.js',
    type: 'module',
  });
  assert.equal(manifest.side_panel.default_path, 'src/sidepanel/sidepanel.html');
  assert.equal(manifest.options_page, 'src/options/options.html');
});
