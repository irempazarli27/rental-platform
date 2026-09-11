/* eslint-disable */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TYPE user_role AS ENUM ('user', 'admin');
    CREATE TYPE user_status AS ENUM ('active', 'suspended');
    CREATE TYPE verification_level AS ENUM ('none', 'email', 'phone', 'id_verified');
    CREATE TYPE item_condition AS ENUM ('new', 'like_new', 'good', 'fair');
    CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');
    CREATE TYPE item_status AS ENUM ('draft', 'active', 'paused', 'deleted');
    CREATE TYPE delivery_method AS ENUM ('pickup', 'delivery', 'both');
    CREATE TYPE availability_block_reason AS ENUM ('manual', 'rental');
    CREATE TYPE rental_status AS ENUM (
      'PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'READY_FOR_HANDOVER',
      'ACTIVE', 'RETURN_PENDING', 'RETURNED', 'COMPLETED', 'DISPUTED'
    );
    CREATE TYPE handover_type AS ENUM ('PICKUP', 'RETURN');
    CREATE TYPE handover_status AS ENUM ('in_progress', 'completed');
    CREATE TYPE handover_step AS ENUM (
      'FRONT', 'BACK', 'LEFT', 'RIGHT', 'DAMAGE', 'SERIAL', 'ACCESSORIES', 'VIDEO'
    );
    CREATE TYPE media_type AS ENUM ('photo', 'video');
    CREATE TYPE damage_severity AS ENUM ('minor', 'moderate', 'severe');
    CREATE TYPE damage_status AS ENUM ('open', 'acknowledged', 'disputed', 'resolved');
    CREATE TYPE dispute_status AS ENUM (
      'open', 'under_review', 'resolved_favor_owner', 'resolved_favor_renter', 'resolved_split'
    );
    CREATE TYPE payment_type AS ENUM ('rental_fee', 'deposit_hold', 'deposit_release', 'platform_fee');
    CREATE TYPE payment_status AS ENUM ('pending', 'authorized', 'captured', 'released', 'failed');
    CREATE TYPE deposit_status AS ENUM ('held', 'released', 'claimed', 'partial_claimed');

    CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- USERS
    CREATE TABLE users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email varchar(255) NOT NULL UNIQUE,
      password_hash varchar(255) NOT NULL,
      full_name varchar(150) NOT NULL,
      phone varchar(30),
      avatar_url text,
      bio text,
      city varchar(100),
      district varchar(100),
      lat double precision,
      lng double precision,
      rating_avg numeric(3,2) NOT NULL DEFAULT 0,
      rating_count integer NOT NULL DEFAULT 0,
      verification_level verification_level NOT NULL DEFAULT 'none',
      email_verified_at timestamptz,
      phone_verified_at timestamptz,
      status user_status NOT NULL DEFAULT 'active',
      role user_role NOT NULL DEFAULT 'user',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    -- REFRESH TOKENS
    CREATE TABLE refresh_tokens (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash varchar(255) NOT NULL,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

    -- CATEGORIES
    CREATE TABLE categories (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
      name varchar(100) NOT NULL,
      slug varchar(120) NOT NULL UNIQUE,
      icon varchar(50),
      default_risk_level risk_level NOT NULL DEFAULT 'low',
      is_active boolean NOT NULL DEFAULT true,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_categories_parent_id ON categories(parent_id);

    -- ITEMS
    CREATE TABLE items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      title varchar(150) NOT NULL,
      description text NOT NULL,
      brand varchar(100),
      model varchar(100),
      serial_number varchar(100),
      condition item_condition NOT NULL DEFAULT 'good',
      risk_level risk_level NOT NULL DEFAULT 'low',
      daily_price numeric(10,2) NOT NULL,
      weekly_price numeric(10,2),
      deposit_amount numeric(10,2) NOT NULL DEFAULT 0,
      currency varchar(3) NOT NULL DEFAULT 'TRY',
      delivery_method delivery_method NOT NULL DEFAULT 'pickup',
      city varchar(100),
      district varchar(100),
      lat double precision,
      lng double precision,
      status item_status NOT NULL DEFAULT 'draft',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TRIGGER trg_items_updated_at BEFORE UPDATE ON items
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    CREATE INDEX idx_items_status_category ON items(status, category_id);
    CREATE INDEX idx_items_owner_id ON items(owner_id);
    CREATE INDEX idx_items_daily_price ON items(daily_price);
    CREATE INDEX idx_items_lat_lng ON items(lat, lng);
    CREATE INDEX idx_items_search ON items
      USING GIN (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));

    -- ITEM ACCESSORIES
    CREATE TABLE item_accessories (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      name varchar(150) NOT NULL,
      quantity integer NOT NULL DEFAULT 1
    );
    CREATE INDEX idx_item_accessories_item_id ON item_accessories(item_id);

    -- ITEM IMAGES
    CREATE TABLE item_images (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      url text NOT NULL,
      sort_order integer NOT NULL DEFAULT 0,
      is_cover boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_item_images_item_id ON item_images(item_id);

    -- ITEM AVAILABILITY BLOCKS
    CREATE TABLE item_availability_blocks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      start_date date NOT NULL,
      end_date date NOT NULL,
      reason availability_block_reason NOT NULL DEFAULT 'manual',
      rental_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      CHECK (end_date >= start_date)
    );
    CREATE INDEX idx_availability_blocks_item_dates ON item_availability_blocks(item_id, start_date, end_date);

    -- RENTALS
    CREATE TABLE rentals (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
      renter_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      start_date date NOT NULL,
      end_date date NOT NULL,
      daily_price_snapshot numeric(10,2) NOT NULL,
      rental_price numeric(10,2) NOT NULL,
      deposit_amount numeric(10,2) NOT NULL,
      platform_fee numeric(10,2) NOT NULL,
      total_amount numeric(10,2) NOT NULL,
      status rental_status NOT NULL DEFAULT 'PENDING',
      delivery_method delivery_method NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      accepted_at timestamptz,
      rejected_at timestamptz,
      cancelled_at timestamptz,
      completed_at timestamptz,
      CHECK (end_date >= start_date)
    );
    CREATE TRIGGER trg_rentals_updated_at BEFORE UPDATE ON rentals
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    CREATE INDEX idx_rentals_item_status ON rentals(item_id, status);
    CREATE INDEX idx_rentals_renter_id ON rentals(renter_id);
    CREATE INDEX idx_rentals_owner_id ON rentals(owner_id);
    CREATE INDEX idx_rentals_dates ON rentals(start_date, end_date);

    ALTER TABLE item_availability_blocks
      ADD CONSTRAINT fk_availability_blocks_rental
      FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE CASCADE;

    -- HANDOVER RECORDS
    CREATE TABLE handover_records (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      rental_id uuid NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
      type handover_type NOT NULL,
      linked_record_id uuid REFERENCES handover_records(id) ON DELETE SET NULL,
      performed_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      confirmed_by uuid REFERENCES users(id) ON DELETE SET NULL,
      confirmed_at timestamptz,
      condition_notes text,
      serial_number_confirmed boolean,
      accessories_confirmed jsonb,
      status handover_status NOT NULL DEFAULT 'in_progress',
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (rental_id, type)
    );
    CREATE INDEX idx_handover_records_rental_id ON handover_records(rental_id);

    -- HANDOVER MEDIA
    CREATE TABLE handover_media (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      handover_record_id uuid NOT NULL REFERENCES handover_records(id) ON DELETE CASCADE,
      step handover_step NOT NULL,
      media_type media_type NOT NULL,
      url text NOT NULL,
      uploaded_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_handover_media_record_id ON handover_media(handover_record_id);

    -- DAMAGE REPORTS
    CREATE TABLE damage_reports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      rental_id uuid NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
      handover_record_id uuid REFERENCES handover_records(id) ON DELETE SET NULL,
      reported_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      description text NOT NULL,
      severity damage_severity NOT NULL DEFAULT 'minor',
      status damage_status NOT NULL DEFAULT 'open',
      ai_flag jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_damage_reports_rental_id ON damage_reports(rental_id);

    -- REVIEWS
    CREATE TABLE reviews (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      rental_id uuid NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
      reviewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reviewee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment text,
      visible_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (rental_id, reviewer_id)
    );
    CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);

    -- CONVERSATIONS
    CREATE TABLE conversations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      rental_id uuid REFERENCES rentals(id) ON DELETE SET NULL,
      item_id uuid REFERENCES items(id) ON DELETE SET NULL,
      participant_one_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      participant_two_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_conversations_participants ON conversations(participant_one_id, participant_two_id);

    -- MESSAGES
    CREATE TABLE messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content text NOT NULL,
      flagged boolean NOT NULL DEFAULT false,
      read_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);

    -- DISPUTES
    CREATE TABLE disputes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      rental_id uuid NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
      opened_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      reason text NOT NULL,
      status dispute_status NOT NULL DEFAULT 'open',
      resolution_notes text,
      resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
      resolved_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_disputes_rental_id ON disputes(rental_id);
    CREATE INDEX idx_disputes_status ON disputes(status);

    -- DISPUTE EVIDENCE
    CREATE TABLE dispute_evidence (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      dispute_id uuid NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
      uploaded_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      media_url text NOT NULL,
      description text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_dispute_evidence_dispute_id ON dispute_evidence(dispute_id);

    -- NOTIFICATIONS
    CREATE TABLE notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type varchar(50) NOT NULL,
      title varchar(200) NOT NULL,
      body text NOT NULL,
      related_entity_type varchar(50),
      related_entity_id uuid,
      read_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_notifications_user_read ON notifications(user_id, read_at);

    -- DEPOSIT HOLDS
    CREATE TABLE deposit_holds (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      rental_id uuid NOT NULL UNIQUE REFERENCES rentals(id) ON DELETE CASCADE,
      amount numeric(10,2) NOT NULL,
      status deposit_status NOT NULL DEFAULT 'held',
      claimed_amount numeric(10,2),
      claim_reason text,
      released_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    -- PAYMENTS
    CREATE TABLE payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      rental_id uuid NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
      type payment_type NOT NULL,
      amount numeric(10,2) NOT NULL,
      status payment_status NOT NULL DEFAULT 'pending',
      provider varchar(50),
      provider_reference varchar(255),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_payments_rental_id ON payments(rental_id);

    -- ADMIN ACTIONS
    CREATE TABLE admin_actions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      action_type varchar(50) NOT NULL,
      target_type varchar(50) NOT NULL,
      target_id uuid NOT NULL,
      notes text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_admin_actions_target ON admin_actions(target_type, target_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS admin_actions CASCADE;
    DROP TABLE IF EXISTS payments CASCADE;
    DROP TABLE IF EXISTS deposit_holds CASCADE;
    DROP TABLE IF EXISTS notifications CASCADE;
    DROP TABLE IF EXISTS dispute_evidence CASCADE;
    DROP TABLE IF EXISTS disputes CASCADE;
    DROP TABLE IF EXISTS messages CASCADE;
    DROP TABLE IF EXISTS conversations CASCADE;
    DROP TABLE IF EXISTS reviews CASCADE;
    DROP TABLE IF EXISTS damage_reports CASCADE;
    DROP TABLE IF EXISTS handover_media CASCADE;
    DROP TABLE IF EXISTS handover_records CASCADE;
    DROP TABLE IF EXISTS rentals CASCADE;
    DROP TABLE IF EXISTS item_availability_blocks CASCADE;
    DROP TABLE IF EXISTS item_images CASCADE;
    DROP TABLE IF EXISTS item_accessories CASCADE;
    DROP TABLE IF EXISTS items CASCADE;
    DROP TABLE IF EXISTS categories CASCADE;
    DROP TABLE IF EXISTS refresh_tokens CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP FUNCTION IF EXISTS set_updated_at();
    DROP TYPE IF EXISTS deposit_status;
    DROP TYPE IF EXISTS payment_status;
    DROP TYPE IF EXISTS payment_type;
    DROP TYPE IF EXISTS dispute_status;
    DROP TYPE IF EXISTS damage_status;
    DROP TYPE IF EXISTS damage_severity;
    DROP TYPE IF EXISTS media_type;
    DROP TYPE IF EXISTS handover_step;
    DROP TYPE IF EXISTS handover_status;
    DROP TYPE IF EXISTS handover_type;
    DROP TYPE IF EXISTS rental_status;
    DROP TYPE IF EXISTS availability_block_reason;
    DROP TYPE IF EXISTS delivery_method;
    DROP TYPE IF EXISTS item_status;
    DROP TYPE IF EXISTS risk_level;
    DROP TYPE IF EXISTS item_condition;
    DROP TYPE IF EXISTS verification_level;
    DROP TYPE IF EXISTS user_status;
    DROP TYPE IF EXISTS user_role;
  `);
};
