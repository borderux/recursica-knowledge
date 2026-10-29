-- The model gateway's database role. The router (router.mjs, pgDb) signs in to CircleChat's
-- database as cc_gateway_read, which reads only the columns the router needs and writes nothing.
-- setup-host.sh runs this file with psql as the database's owner, after CircleChat's migrations,
-- and passes the role's password as the variable "password". A rerun sets the same grants again.
\set ON_ERROR_STOP on

SELECT NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cc_gateway_read') AS missing \gset
\if :missing
CREATE ROLE cc_gateway_read;
\endif
ALTER ROLE cc_gateway_read WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT
  CONNECTION LIMIT 8 PASSWORD :'password';
ALTER ROLE cc_gateway_read SET default_transaction_read_only = on;

-- Start from nothing, then grant each column the router reads.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM cc_gateway_read;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM cc_gateway_read;
REVOKE CREATE ON SCHEMA public FROM cc_gateway_read;
GRANT USAGE ON SCHEMA public TO cc_gateway_read;
SELECT format('GRANT CONNECT ON DATABASE %I TO cc_gateway_read', current_database()) \gexec

DO $$
DECLARE
  -- Each table and the columns the router reads from it.
  reads constant text[][] := ARRAY[
    ['agent_runs', 'agent_id, status, context_json'],
    ['agents', 'id, handle, bot_token'],
    ['members', 'id, workspace_id, kind, ref_id'],
    ['tasks', 'id, workspace_id, created_by'],
    ['task_assignees', 'task_id, member_id'],
    ['task_cloud_models', 'task_id, mode, max_start_wait_minutes, max_finish_minutes']
  ];
  r text[];
BEGIN
  FOREACH r SLICE 1 IN ARRAY reads LOOP
    -- A CircleChat without the "Cloud models" setting has no task_cloud_models table: the router
    -- then treats every task as cluster only.
    IF to_regclass('public.' || r[1]) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT (%s) ON public.%I TO cc_gateway_read', r[2], r[1]);
    END IF;
  END LOOP;
END $$;
