-- The Slack notifier's database role. The notifier (notify.mjs) signs in to CircleChat's database
-- as cc_notify, which reads only the columns the notifier reads. The role writes only the code
-- columns of user_slack, for the Slack ID check (CircleChat's docs/slack-dms.md).
-- setup-host.sh runs this file with psql as the database's owner, after CircleChat's migrations,
-- and passes the role's password as the variable "password". A rerun sets the same grants again.
\set ON_ERROR_STOP on

SELECT NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cc_notify') AS missing \gset
\if :missing
CREATE ROLE cc_notify;
\endif
ALTER ROLE cc_notify WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT
  CONNECTION LIMIT 6 PASSWORD :'password';

-- Start from nothing, then grant each column the notifier reads, and the code columns the notifier writes.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM cc_notify;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM cc_notify;
REVOKE CREATE ON SCHEMA public FROM cc_notify;
GRANT USAGE ON SCHEMA public TO cc_notify;
SELECT format('GRANT CONNECT ON DATABASE %I TO cc_notify', current_database()) \gexec

DO $$
DECLARE
  -- Each table, and the columns the notifier reads from the table.
  reads constant text[][] := ARRAY[
    ['members', 'id, kind, ref_id'],
    ['users', 'id, handle, email'],
    ['agents', 'id, handle'],
    ['tasks', 'id, title, status, archived, updated_at'],
    ['task_activity', 'ts, task_id, actor_member_id, kind, payload'],
    ['task_comments', 'ts, task_id, member_id, body_md, mentions, deleted_at'],
    ['task_assignees', 'task_id, member_id'],
    ['agent_runs', 'agent_id, started_at, result_json'],
    ['conversations', 'id, kind, name'],
    ['messages', 'ts, member_id, body_md, mentions, deleted_at, conversation_id'],
    ['approvals', 'created_at, status, action, agent_id'],
    ['user_slack', 'user_id, slack_user_id, pending_slack_user_id, code_requested_at, code_sent_at, send_error']
  ];
  r text[];
BEGIN
  FOREACH r SLICE 1 IN ARRAY reads LOOP
    -- A CircleChat without the Slack ID check has no user_slack table: the notifier then uses
    -- site.json's notify.people only.
    IF to_regclass('public.' || r[1]) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT (%s) ON public.%I TO cc_notify', r[2], r[1]);
    END IF;
  END LOOP;
  -- The only writes: a new code's salt, hash and times, the try count, and Slack's error.
  IF to_regclass('public.user_slack') IS NOT NULL THEN
    GRANT UPDATE (code_salt, code_hash, code_sent_at, code_expires_at, code_attempts, send_error, updated_at)
      ON public.user_slack TO cc_notify;
  END IF;
END $$;
