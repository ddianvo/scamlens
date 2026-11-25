import { MigrationInterface, QueryRunner } from 'typeorm';
export class InitialSchema1795000000000 implements MigrationInterface {
  name = 'InitialSchema1795000000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      `CREATE TABLE users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email varchar NOT NULL UNIQUE, name varchar NOT NULL, "passwordHash" varchar NOT NULL, role varchar NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')), "sessionVersion" integer NOT NULL DEFAULT 0, "createdAt" timestamptz NOT NULL DEFAULT now())`,
    );
    await q.query(
      `CREATE TABLE reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), type varchar NOT NULL CHECK(type IN ('domain','phone','bank')), identifier varchar NOT NULL, bank varchar NOT NULL DEFAULT '', description text NOT NULL, evidence text NOT NULL, "publicSummary" text NOT NULL DEFAULT '', status varchar NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), "reviewReason" text NOT NULL DEFAULT '', "reviewerId" uuid REFERENCES users(id), "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, "isDemo" boolean NOT NULL DEFAULT false, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`,
    );
    await q.query(
      `CREATE INDEX reports_identifier_idx ON reports(identifier); CREATE INDEX reports_user_idx ON reports("userId"); CREATE INDEX reports_status_idx ON reports(status)`,
    );
    await q.query(
      `CREATE TABLE verified_subjects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), type varchar NOT NULL CHECK(type IN ('domain','phone','bank')), identifier varchar NOT NULL, bank varchar NOT NULL DEFAULT '', verdict varchar NOT NULL CHECK(verdict IN ('caution','official')), note text NOT NULL, "isDemo" boolean NOT NULL DEFAULT false, "updatedAt" timestamptz NOT NULL DEFAULT now(), UNIQUE(type, identifier, bank))`,
    );
    await q.query(
      `CREATE TABLE rules (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar NOT NULL UNIQUE, title varchar NOT NULL, keywords jsonb NOT NULL, weight integer NOT NULL CHECK(weight >= 0 AND weight <= 100), reason text NOT NULL, action text NOT NULL, enabled boolean NOT NULL DEFAULT true)`,
    );
    await q.query(
      `CREATE TABLE histories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, type varchar NOT NULL CHECK(type IN ('message','url')), content text NOT NULL, result jsonb NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now()); CREATE INDEX histories_user_idx ON histories("userId")`,
    );
  }
  async down(q: QueryRunner): Promise<void> {
    for (const table of ['histories', 'rules', 'verified_subjects', 'reports', 'users'])
      await q.query(`DROP TABLE ${table}`);
  }
}
