/* eslint-disable */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
      ADD COLUMN id_verified_at timestamptz,
      -- HMAC of the national ID number, never the number itself: only used to
      -- stop one ID from verifying several accounts.
      ADD COLUMN id_number_hash varchar(64) UNIQUE,
      ADD COLUMN verification_consent_at timestamptz;

    CREATE TABLE verification_codes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      channel varchar(10) NOT NULL CHECK (channel IN ('email', 'phone')),
      target varchar(255) NOT NULL,
      code_hash varchar(64) NOT NULL,
      attempts integer NOT NULL DEFAULT 0,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (user_id, channel)
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE verification_codes;
    ALTER TABLE users
      DROP COLUMN verification_consent_at,
      DROP COLUMN id_number_hash,
      DROP COLUMN id_verified_at;
  `);
};
