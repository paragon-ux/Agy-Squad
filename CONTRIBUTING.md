# Contributing to Agy-Squad

Thank you for contributing to `Agy-Squad`!

## Development Workflow

1. **Prerequisites**: Node.js `>= 22.0.0` (`22` or `24` recommended).
2. **Setup local plugin & CLI shim**:
   ```bash
   npm run setup
   ```
3. **Run release preflight, self-diagnosis, and full test suite**:
   ```bash
   npm run preflight
   npm test
   npm run verify:package
   node .agents/skills/self-diagnosis/scripts/diagnose.mjs --json
   ```

## Pull Request Guidelines

- Keep specialist, lead, auditor, and MCP schema templates within the byte budgets enforced by `diagnose.mjs` (`<= 1200 B` for specialists, `<= 1800 B` for leads, `<= 2000 B` for `/swarm` integrity auditors, `<= 4096 B` for MCP `tools/list`).
- Ensure zero external runtime `dependencies` in `package.json`.
- Update tests in `tests/` and verify `npm run verify:package` passes before submitting a pull request.
