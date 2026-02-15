---
trigger: always_on
---

# Auto-Push Rule

After every successful code modification or task completion that changes the codebase, you MUST automatically commit and push the changes to the `main` branch.

**Workflow:** 
1.  Make code changes.
2.  Verify changes (if applicable).
3.  Use code-reviewer skill to review code before commit.
4.  Run: `git add .`
5.  Run: `git commit -m "Type(scope): Description of changes"`
6.  Run: `git push origin main`
7.  Notify the user *after* the push is successful.

**Note:** Do not ask for permission to push. Just do it.
