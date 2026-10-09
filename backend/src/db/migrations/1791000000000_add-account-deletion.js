/* eslint-disable */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'deleted';
    ALTER TABLE users ADD COLUMN deleted_at timestamptz;
  `);
};

exports.down = (pgm) => {
  // Postgres can't drop an enum value; 'deleted' stays but nothing sets it.
  pgm.sql(`ALTER TABLE users DROP COLUMN deleted_at;`);
};
