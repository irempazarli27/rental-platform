/* eslint-disable */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    -- Model output kept so the same input is never paid for twice. A result is
    -- reused only while its input_hash still matches what would be sent now.
    CREATE TABLE ai_results (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      kind varchar(40) NOT NULL,
      subject_id uuid NOT NULL,
      input_hash varchar(64) NOT NULL,
      output jsonb NOT NULL,
      model varchar(100) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (kind, subject_id)
    );

    -- One row per call to the provider, for the per-user and global daily caps.
    CREATE TABLE ai_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      kind varchar(40) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX ai_requests_created_at_idx ON ai_requests (created_at);
    CREATE INDEX ai_requests_user_created_idx ON ai_requests (user_id, created_at);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE ai_requests; DROP TABLE ai_results;`);
};
