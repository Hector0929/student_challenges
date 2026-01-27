# Auto-Push Rule

After every successful code modification or task completion that changes the codebase, you MUST automatically commit and push the changes to the `main` branch.

**Workflow:**
1.  Make code changes.
2.  Verify changes (if applicable).
3.  Run: `git add .`
4.  Run: `git commit -m "Type(scope): Description of changes"`
5.  Run: `git push origin main`
6.  Notify the user *after* the push is successful.

**Note:** Do not ask for permission to push. Just do it.
