# MasteryPath Supabase Setup Guide

This guide explains, step by step, how to create a Supabase account, create a Supabase project, build the MasteryPath database, secure it, and connect the MasteryPath application.

It is written as a DevOps learning and relearning guide. It explains not only what to click, but also what each component does and why it is needed.

> [!IMPORTANT]
> MasteryPath is already connected to a live Supabase project. To practise this setup safely, create a separate project named `mastery-path-dev` and connect a local or development copy of the application to it. Do not replace the live project configuration until the development setup has been tested.

## 1. Understand the architecture

Supabase provides the database, authentication, API, and real-time communication used by MasteryPath.

```text
MasteryPath browser application
             |
             | Project URL and publishable key
             v
       Supabase Auth
             |
             | Signed-in user receives a JWT
             v
      Supabase Data API
             |
             v
      PostgreSQL database
             |
             v
 Row Level Security checks owner = signed-in user
```

### Important terms

| Term | Meaning |
|---|---|
| Supabase account | Your developer or administrator login to Supabase |
| Organization | A container that holds one or more Supabase projects |
| Project | A Postgres database, authentication service, API, and Realtime service |
| MasteryPath family account | A user account created inside Supabase Authentication |
| Publishable key | A public identifier that allows the frontend to contact the Supabase project |
| Secret key | A powerful server-side credential that must never appear in browser code or GitHub |
| JWT | A signed token that proves which user is currently authenticated |
| Row Level Security | Database rules that decide which rows a user may read or change |

## 2. Create a Supabase account

1. Open [Supabase](https://supabase.com/).
2. Select **Start your project**.
3. Sign up using GitHub or an email address.
4. Confirm your email address if requested.
5. Sign in to the Supabase Dashboard.
6. Create an organization if Supabase asks you to create one.

An example organization name is:

```text
IbkWilliams Projects
```

## 3. Create a development project

1. Select **New project**.
2. Choose your organization.
3. Enter this project name:

   ```text
   mastery-path-dev
   ```

4. Generate a strong database password.
5. Save the password in a password manager. Do not place it in GitHub.
6. Select a region reasonably close to the expected users.
7. Select the free plan for learning.
8. Select **Create new project**.
9. Wait until Supabase reports that the database is ready.

Supabase documents this project-creation workflow in its [getting-started tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-react).

## 4. Create the MasteryPath database

Open the following area of the Supabase Dashboard:

```text
Database
SQL Editor
New query
```

Paste the following SQL into the editor. Use this script on a new, empty development project.

```sql
create extension if not exists pgcrypto;

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  topic text not null,
  skill text not null,
  difficulty smallint not null check (difficulty between 1 and 5),
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer text not null check (correct_answer in ('A', 'B', 'C', 'D')),
  explanation text not null default '',
  status text not null default 'approved'
    check (status in ('draft', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id text primary key,
  owner uuid not null references auth.users(id) on delete cascade,
  student_id text not null,
  subject text not null,
  topic text not null,
  type text not null
    check (type in ('practice', 'review', 'diagnostic')),
  started_at timestamptz not null,
  completed_at timestamptz not null,
  correct integer not null default 0,
  total integer not null check (total > 0),
  constraint sessions_score_check
    check (correct >= 0 and correct <= total)
);

create table if not exists public.attempts (
  id text primary key,
  owner uuid not null references auth.users(id) on delete cascade,
  student_id text not null,
  session_id text not null,
  subject text not null,
  question_id uuid not null
    references public.questions(id) on delete cascade,
  topic text not null,
  skill text not null,
  difficulty smallint not null check (difficulty between 1 and 5),
  selected text not null check (selected in ('A', 'B', 'C', 'D')),
  correct boolean not null,
  response_ms integer not null check (response_ms >= 0),
  at timestamptz not null default now()
);

create table if not exists public.app_settings (
  owner uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists questions_owner_created_idx
  on public.questions(owner, created_at);

create index if not exists questions_owner_topic_idx
  on public.questions(owner, subject, topic, difficulty);

create index if not exists attempts_owner_time_idx
  on public.attempts(owner, at);

create index if not exists attempts_owner_topic_idx
  on public.attempts(owner, student_id, subject, topic);

create index if not exists attempts_question_idx
  on public.attempts(question_id);

create index if not exists sessions_owner_time_idx
  on public.sessions(owner, started_at);

create index if not exists sessions_owner_topic_idx
  on public.sessions(owner, student_id, subject, topic);

alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.sessions enable row level security;
alter table public.app_settings enable row level security;

revoke all on table
  public.questions,
  public.attempts,
  public.sessions,
  public.app_settings
from anon, authenticated;

grant usage on schema public to authenticated;

grant select, insert, update, delete on table
  public.questions,
  public.attempts,
  public.sessions,
  public.app_settings
to authenticated;

drop policy if exists questions_select_own on public.questions;
drop policy if exists questions_insert_own on public.questions;
drop policy if exists questions_update_own on public.questions;
drop policy if exists questions_delete_own on public.questions;

create policy questions_select_own
on public.questions for select
to authenticated
using ((select auth.uid()) = owner);

create policy questions_insert_own
on public.questions for insert
to authenticated
with check ((select auth.uid()) = owner);

create policy questions_update_own
on public.questions for update
to authenticated
using ((select auth.uid()) = owner)
with check ((select auth.uid()) = owner);

create policy questions_delete_own
on public.questions for delete
to authenticated
using ((select auth.uid()) = owner);

drop policy if exists attempts_select_own on public.attempts;
drop policy if exists attempts_insert_own on public.attempts;
drop policy if exists attempts_update_own on public.attempts;
drop policy if exists attempts_delete_own on public.attempts;

create policy attempts_select_own
on public.attempts for select
to authenticated
using ((select auth.uid()) = owner);

create policy attempts_insert_own
on public.attempts for insert
to authenticated
with check ((select auth.uid()) = owner);

create policy attempts_update_own
on public.attempts for update
to authenticated
using ((select auth.uid()) = owner)
with check ((select auth.uid()) = owner);

create policy attempts_delete_own
on public.attempts for delete
to authenticated
using ((select auth.uid()) = owner);

drop policy if exists sessions_select_own on public.sessions;
drop policy if exists sessions_insert_own on public.sessions;
drop policy if exists sessions_update_own on public.sessions;
drop policy if exists sessions_delete_own on public.sessions;

create policy sessions_select_own
on public.sessions for select
to authenticated
using ((select auth.uid()) = owner);

create policy sessions_insert_own
on public.sessions for insert
to authenticated
with check ((select auth.uid()) = owner);

create policy sessions_update_own
on public.sessions for update
to authenticated
using ((select auth.uid()) = owner)
with check ((select auth.uid()) = owner);

create policy sessions_delete_own
on public.sessions for delete
to authenticated
using ((select auth.uid()) = owner);

drop policy if exists app_settings_select_own on public.app_settings;
drop policy if exists app_settings_insert_own on public.app_settings;
drop policy if exists app_settings_update_own on public.app_settings;
drop policy if exists app_settings_delete_own on public.app_settings;

create policy app_settings_select_own
on public.app_settings for select
to authenticated
using ((select auth.uid()) = owner);

create policy app_settings_insert_own
on public.app_settings for insert
to authenticated
with check ((select auth.uid()) = owner);

create policy app_settings_update_own
on public.app_settings for update
to authenticated
using ((select auth.uid()) = owner)
with check ((select auth.uid()) = owner);

create policy app_settings_delete_own
on public.app_settings for delete
to authenticated
using ((select auth.uid()) = owner);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'attempts'
  ) then
    alter publication supabase_realtime
      add table public.attempts;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sessions'
  ) then
    alter publication supabase_realtime
      add table public.sessions;
  end if;
end
$$;
```

Select **Run**. Supabase should report that the query completed successfully.

### What each table stores

| Table | Purpose |
|---|---|
| `questions` | Approved questions, answer options, difficulty, skill, and explanation |
| `attempts` | Every answer submitted by the learner |
| `sessions` | Practice, review, and diagnostic session summaries |
| `app_settings` | Learner name, assignments, review schedule, parent PIN, and session settings |

## 5. Understand Row Level Security

Every MasteryPath table contains an `owner` column. Its value is the Supabase user ID of the signed-in family account.

The central security condition is:

```sql
(select auth.uid()) = owner
```

It means:

> Permit the operation only when the signed-in user owns the row.

This prevents one family account from reading or changing another family's data. Supabase recommends enabling Row Level Security on every table exposed through its Data API and explicitly granting only the operations the application needs. See the [Supabase Row Level Security guide](https://supabase.com/docs/guides/database/postgres/row-level-security).

## 6. Verify the tables and security configuration

Open a new SQL Editor query and run:

```sql
select
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Expected result:

| tablename | rowsecurity |
|---|---|
| `app_settings` | `true` |
| `attempts` | `true` |
| `questions` | `true` |
| `sessions` | `true` |

Check the policies:

```sql
select
  tablename,
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

The results should contain select, insert, update, and delete policies for each table.

## 7. Configure email authentication

Open:

```text
Authentication
Sign In or Providers
Email
```

Confirm that:

- Email authentication is enabled.
- New-user registration is allowed.
- **Confirm Email** is enabled for a safer production-style workflow.

MasteryPath uses these Supabase JavaScript methods:

```javascript
SB.auth.signUp({ email, password })
SB.auth.signInWithPassword({ email, password })
```

When email confirmation is enabled, a user must confirm the email address before signing in. Supabase's built-in email service is appropriate for testing but is rate-limited. A production application should eventually use a custom SMTP service. See the [Supabase password authentication guide](https://supabase.com/docs/guides/auth/passwords).

## 8. Configure the application URL

Open:

```text
Authentication
URL Configuration
```

Set **Site URL** to:

```text
https://ibkwilliams1.github.io/mastery-path/
```

Add this value to **Redirect URLs**:

```text
https://ibkwilliams1.github.io/mastery-path/**
```

For local testing through a development web server, add the applicable local URL, for example:

```text
http://localhost:5500/**
```

The Site URL controls where confirmation and password-reset links return the user. See the [Supabase redirect URL documentation](https://supabase.com/docs/guides/auth/redirect-urls).

## 9. Get the project URL and publishable key

Open the project's **Connect** dialog. Alternatively, open:

```text
Project Settings
API Keys
```

Copy these two values:

1. **Project URL**
2. **Publishable key**, beginning with `sb_publishable_`

Do not copy a value beginning with `sb_secret_`. Do not use the legacy `service_role` key in browser code.

A publishable key is intended for public frontend applications when Row Level Security is correctly configured. Secret and service-role keys have elevated access and must never be committed to a public repository. See the [Supabase API key guide](https://supabase.com/docs/guides/getting-started/api-keys).

## 10. Connect MasteryPath to Supabase

Open [`index.html`](index.html) and find the configuration near the top of the JavaScript section:

```javascript
const SUPABASE_URL = "YOUR_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_PUBLISHABLE_KEY";
```

Replace the placeholders with the development project values:

```javascript
const SUPABASE_URL = "https://your-project-reference.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_your_key_here";
```

MasteryPath creates the connection with:

```javascript
SB = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
```

The variable is currently named `SUPABASE_ANON_KEY`, but the value is the newer publishable key. Renaming it later to `SUPABASE_PUBLISHABLE_KEY` would make its purpose clearer.

> [!WARNING]
> Do not push development project values to the production `master` branch. Doing so would redirect the live GitHub Pages application to the development database.

## 11. Enable Realtime

MasteryPath listens for new `attempts` and `sessions` so that the parent dashboard can update across devices.

The SQL setup adds these tables to the `supabase_realtime` publication. Confirm the configuration under:

```text
Database
Publications
supabase_realtime
```

These tables should be enabled:

- `attempts`
- `sessions`

Supabase requires a table to be included in its Realtime publication before the frontend can subscribe to database changes. See the [Supabase Realtime guide](https://supabase.com/docs/guides/realtime/postgres-changes).

## 12. Perform the first end-to-end test

### Test A: Create an account

1. Open the development version of MasteryPath.
2. Select **Create account**.
3. Enter an email address and password.
4. Check the email inbox.
5. Select the confirmation link.
6. Return to MasteryPath.
7. Sign in.

### Test B: Confirm the user in Supabase

Open:

```text
Authentication
Users
```

Confirm that the new email address appears.

### Test C: Import one question

In MasteryPath:

1. Switch to **Parent**.
2. Enter the parent PIN.
3. Open **Question Bank**.
4. Paste one valid CSV question.
5. Select **Validate**.
6. Select **Approve and add**.

In Supabase:

1. Open **Table Editor**.
2. Open `questions`.
3. Confirm that the new question appears.
4. Confirm that `owner` contains the signed-in user's ID.

### Test D: Complete a learner session

1. Switch to **Learner**.
2. Choose Mathematics.
3. Open the imported topic.
4. Answer the questions.
5. Complete the session.

Check the Supabase tables:

- `attempts` should contain one row for every answered question.
- `sessions` should contain the completed session.
- `app_settings` should contain the family configuration.

### Test E: Test account isolation

This is the most important security test:

1. Sign out of the first account.
2. Create a second test account.
3. Sign in with the second account.
4. Confirm that the second account cannot see the first account's questions or progress.

If the second account can see the first account's data, stop testing and repair the Row Level Security configuration.

## 13. Troubleshooting

| Error or symptom | Likely cause | Resolution |
|---|---|---|
| `Invalid API key` | Wrong key or incomplete copy | Copy the publishable key again |
| `Failed to fetch` | Incorrect project URL, paused project, or network problem | Verify the URL, project status, and network connection |
| `relation questions does not exist` | The database schema was not created | Run the schema SQL in the SQL Editor |
| `permission denied for table` | Required grants are missing | Run the grant section of the SQL setup |
| `new row violates row-level security policy` | The user is signed out or `owner` does not match the authenticated user | Sign in and verify the insert policy |
| Confirmation returns to localhost | Site URL is still using its default value | Update Authentication URL Configuration |
| Parent dashboard does not update live | The Realtime publication is not enabled for the tables | Enable `attempts` and `sessions` |
| CSV validates but no questions appear | Approval was not selected or the database insert failed | Select **Approve and add**, then inspect `questions` |
| Another account can see the first account's data | RLS is disabled or a policy is too permissive | Treat this as a security defect and correct it before continuing |

## 14. DevOps learning points

The dashboard setup proves that the application works, but DevOps aims to make infrastructure repeatable, testable, and recoverable.

The next maturity steps are:

1. Save database changes as version-controlled migrations.
2. Maintain separate development and production Supabase projects.
3. Test Row Level Security policies automatically.
4. Apply schema changes through migrations rather than unrecorded dashboard edits.
5. Back up data before destructive database operations.
6. Use GitHub environments and secrets if a backend or deployment automation is added.
7. Never expose a secret or service-role key in frontend code.

A suitable future repository structure is:

```text
mastery-path/
  index.html
  README.md
  SUPABASE_SETUP.md
  supabase/
    migrations/
      001_initial_masterypath_schema.sql
    tests/
      rls_tests.sql
```

## 15. Final verification checklist

- [ ] Supabase account created
- [ ] Development organization selected or created
- [ ] `mastery-path-dev` project created
- [ ] Database password stored securely
- [ ] Four MasteryPath tables created
- [ ] Row Level Security enabled on every table
- [ ] Authenticated-user policies created
- [ ] Email authentication enabled
- [ ] Production Site URL configured
- [ ] Project URL copied
- [ ] Publishable key copied
- [ ] No secret or service-role key added to the frontend
- [ ] Development copy of `index.html` configured
- [ ] Test account created and confirmed
- [ ] Test question imported
- [ ] Test learner session completed
- [ ] Attempts and session rows verified
- [ ] Second account confirmed unable to access the first account's data
- [ ] Realtime update tested across two browser sessions or devices

## Official references

- [Supabase getting-started tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-react)
- [Understanding Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords)
- [Supabase Realtime Postgres changes](https://supabase.com/docs/guides/realtime/postgres-changes)
