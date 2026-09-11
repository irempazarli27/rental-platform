/* eslint-disable */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE user_auth_provider AS ENUM ('password', 'google');

    ALTER TABLE users
      ALTER COLUMN password_hash DROP NOT NULL,
      ADD COLUMN auth_provider user_auth_provider NOT NULL DEFAULT 'password',
      ADD COLUMN google_id varchar(255) UNIQUE;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
      DROP COLUMN google_id,
      DROP COLUMN auth_provider,
      ALTER COLUMN password_hash SET NOT NULL;

    DROP TYPE user_auth_provider;
  `);
};
