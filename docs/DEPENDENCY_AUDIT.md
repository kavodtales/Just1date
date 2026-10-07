# Dependency audit release gate

Audit snapshot: 2026-10-07, Node 24.11 / npm 11.6, current committed lockfile.
The full machine-readable report is [security/npm-audit-2026-10-07.json](security/npm-audit-2026-10-07.json).
The report contains 31 affected dependency entries: 19 high, 11 moderate, one low,
and zero critical. Those entries include transitive dependents, not 31 independent
vulnerabilities. This audit is not clean and production release remains blocked
pending remediation and a reviewed exposure assessment.

| Root advisory        | Audit range      | Remaining dependency path / required work                                                                             |
| -------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| braces               | <=3.0.3          | Expo/Metro toolchain dependencies; obtain a patched compatible toolchain and rerun matching/native build tests        |
| node-forge           | <=1.4.0          | Expo code-signing/toolchain dependencies; update and validate certificate/signature workflows before store releases   |
| decode-uri-component | <=0.4.2          | Expo dependency chain; do not substitute the newer ESM-only major into a CommonJS caller without compatibility review |
| uuid                 | <11.1.1          | xcode/Expo dependency chain; update callers and verify native project generation                                      |
| esbuild              | >=0.27.3 <0.28.1 | tsup retains nested 0.27.7; the root override supplies 0.28.2 elsewhere but did not remediate this nested copy        |

See each advisory URL and resolved dependency location in the report. Do not infer
runtime exploitability or absence of exposure from severity alone. In particular,
the reported esbuild issue concerns its Windows development server; the API build
does not start that server, but the affected copy still needs remediation.

`npm audit fix --force` suggests an incompatible Expo downgrade for parts of this
graph. That was not applied. A safe remediation must preserve SDK, React Native,
Metro, notifications, SecureStore and Expo Router compatibility and then pass a
clean install, lint, typechecks, tests, web/admin/API builds, native exports and
signed device builds. Before launch, rerun `npm audit --json`, review current
advisories, record decisions and enforce the approved CI security policy. Passing
application tests is not proof that these dependencies are secure.
