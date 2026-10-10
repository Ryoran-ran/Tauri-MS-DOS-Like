import { describe, expect, it } from 'vitest';
import type { WebGamePluginManifest } from './gamePlugin';
import { buildSandboxDocument, buildSandboxScript } from './WebGameHost';

const manifest: WebGamePluginManifest = {
  format: 'retrodos.game', manifestVersion: 2, runtime: 'web', id: 'sandbox-test', code: 'SANDBOX', name: 'Sandbox',
  description: 'Sandbox test', version: '1.0.0', author: 'Tester', display: { width: 640, height: 400, scale: 'fit', background: '#000000' },
  source: { html: '<main>Game</main>', css: 'body{color:white}</style><style>bad{}', javascript: "console.log('</script><script>bad()</script>')" },
  achievements: [],
};

describe('web game sandbox document', () => {
  it('blocks external capabilities and keeps embedded closing tags inside source text', () => {
    const document = buildSandboxDocument(manifest, 3);
    const script = buildSandboxScript(manifest, 3);
    expect(document).toContain("connect-src 'none'");
    expect(document).toContain("frame-src 'none'");
    expect(document).toContain("script-src 'unsafe-inline'");
    expect(document).toContain('{"gameId":"sandbox-test","run":3}');
    expect(script).toContain('{"gameId":"sandbox-test","run":3}');
    expect(document).not.toContain('</script><script>bad()');
    expect(document).not.toContain('</style><style>bad{}');
  });
});
