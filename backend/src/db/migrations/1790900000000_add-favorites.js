/* eslint-disable */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE favorites (
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, item_id)
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE favorites;`);
};
