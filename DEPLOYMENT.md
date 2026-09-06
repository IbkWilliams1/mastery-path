# Math Explorer release

This release replaces the public learner frontend at the existing `/mastery-path/` address with the integrated Math Explorer design. The original parent tools are available at `parent.html` with the existing PIN gate.

Source repository: https://github.com/IbkWilliams1/math-explorer-adventures
Source commit: a27c1c5
Build command: npm ci, then npm run build:pages (with the public Supabase environment values from .env.example).
Deployment files: generated contents of dist/client. No Node runtime is needed on GitHub Pages.

Validated: eight integration tests, TypeScript, lint (no errors), static build, signed-in topic and progress loading, direct route reloads, parent PIN gate, and an owner-completed practice session whose saved results appeared in both interfaces.

GitHub Pages currently publishes the master branch root. Merging this release PR triggers the normal Pages publication at the same address. There are no database migrations or account changes.

Rollback: revert the deployment commit on master. This restores the earlier frontend without removing cloud questions or attempts. The previous release is commit f36cbc6b8f146ab0e94f6f49a8ab86d7b7208887.

Future edits belong in the source repository. Rebuild and copy dist/client into a new release branch; do not edit minified assets manually. Direct nested routes use the custom 404 shell, which is normal for this static SPA deployment.
