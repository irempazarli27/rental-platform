import type { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely";

// Non-nullable timestamptz column with a DB-side default (e.g. created_at).
type GeneratedTimestamp = ColumnType<Date, Date | string | undefined, Date | string>;
// Non-nullable timestamptz column with no default — must be supplied on insert.
type Timestamp = ColumnType<Date, Date | string, Date | string>;
// Nullable timestamptz column with no default — Postgres defaults it to NULL when omitted.
type NullableTimestamp = ColumnType<Date | null, Date | string | null | undefined, Date | string | null>;
// Any other nullable column with no default — optional on insert, defaults to NULL.
type Nullable<T> = ColumnType<T | null, T | null | undefined, T | null>;

export type UserRole = "user" | "admin";
export type UserStatus = "active" | "suspended";
export type UserAuthProvider = "password" | "google";
export type VerificationLevel = "none" | "email" | "phone" | "id_verified";
export type ItemCondition = "new" | "like_new" | "good" | "fair";
export type RiskLevel = "low" | "medium" | "high";
export type ItemStatus = "draft" | "active" | "paused" | "deleted";
export type DeliveryMethod = "pickup" | "delivery" | "both";
export type AvailabilityBlockReason = "manual" | "rental";
export type RentalStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "READY_FOR_HANDOVER"
  | "ACTIVE"
  | "RETURN_PENDING"
  | "RETURNED"
  | "COMPLETED"
  | "DISPUTED";
export type HandoverType = "PICKUP" | "RETURN";
export type HandoverStatus = "in_progress" | "completed";
export type HandoverStep =
  | "FRONT"
  | "BACK"
  | "LEFT"
  | "RIGHT"
  | "DAMAGE"
  | "SERIAL"
  | "ACCESSORIES"
  | "VIDEO";
export type MediaType = "photo" | "video";
export type DamageSeverity = "minor" | "moderate" | "severe";
export type DamageStatus = "open" | "acknowledged" | "disputed" | "resolved";
export type DisputeStatus =
  | "open"
  | "under_review"
  | "resolved_favor_owner"
  | "resolved_favor_renter"
  | "resolved_split";
export type PaymentType = "rental_fee" | "deposit_hold" | "deposit_release" | "platform_fee";
export type PaymentStatus = "pending" | "authorized" | "captured" | "released" | "failed";
export type DepositStatus = "held" | "released" | "claimed" | "partial_claimed";

export interface UsersTable {
  id: Generated<string>;
  email: string;
  password_hash: Nullable<string>;
  auth_provider: Generated<UserAuthProvider>;
  google_id: Nullable<string>;
  full_name: string;
  phone: Nullable<string>;
  avatar_url: Nullable<string>;
  bio: Nullable<string>;
  city: Nullable<string>;
  district: Nullable<string>;
  lat: Nullable<number>;
  lng: Nullable<number>;
  rating_avg: Generated<string>;
  rating_count: Generated<number>;
  verification_level: Generated<VerificationLevel>;
  email_verified_at: NullableTimestamp;
  phone_verified_at: NullableTimestamp;
  id_verified_at: NullableTimestamp;
  id_number_hash: Nullable<string>;
  verification_consent_at: NullableTimestamp;
  status: Generated<UserStatus>;
  role: Generated<UserRole>;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
}

export interface VerificationCodesTable {
  id: Generated<string>;
  user_id: string;
  channel: "email" | "phone";
  target: string;
  code_hash: string;
  attempts: Generated<number>;
  expires_at: Timestamp;
  created_at: GeneratedTimestamp;
}

export interface RefreshTokensTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  expires_at: Timestamp;
  revoked_at: NullableTimestamp;
  created_at: GeneratedTimestamp;
}

export interface CategoriesTable {
  id: Generated<string>;
  parent_id: Nullable<string>;
  name: string;
  slug: string;
  icon: Nullable<string>;
  default_risk_level: Generated<RiskLevel>;
  is_active: Generated<boolean>;
  sort_order: Generated<number>;
  created_at: GeneratedTimestamp;
}

export interface ItemsTable {
  id: Generated<string>;
  owner_id: string;
  category_id: string;
  title: string;
  description: string;
  brand: Nullable<string>;
  model: Nullable<string>;
  serial_number: Nullable<string>;
  condition: Generated<ItemCondition>;
  risk_level: Generated<RiskLevel>;
  daily_price: string;
  weekly_price: Nullable<string>;
  deposit_amount: Generated<string>;
  currency: Generated<string>;
  delivery_method: Generated<DeliveryMethod>;
  city: Nullable<string>;
  district: Nullable<string>;
  lat: Nullable<number>;
  lng: Nullable<number>;
  status: Generated<ItemStatus>;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
}

export interface ItemAccessoriesTable {
  id: Generated<string>;
  item_id: string;
  name: string;
  quantity: Generated<number>;
}

export interface ItemImagesTable {
  id: Generated<string>;
  item_id: string;
  url: string;
  sort_order: Generated<number>;
  is_cover: Generated<boolean>;
  created_at: GeneratedTimestamp;
}

export interface ItemAvailabilityBlocksTable {
  id: Generated<string>;
  item_id: string;
  start_date: string;
  end_date: string;
  reason: Generated<AvailabilityBlockReason>;
  rental_id: Nullable<string>;
  created_at: GeneratedTimestamp;
}

export interface RentalsTable {
  id: Generated<string>;
  item_id: string;
  renter_id: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  daily_price_snapshot: string;
  rental_price: string;
  deposit_amount: string;
  platform_fee: string;
  total_amount: string;
  status: Generated<RentalStatus>;
  delivery_method: DeliveryMethod;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
  accepted_at: NullableTimestamp;
  rejected_at: NullableTimestamp;
  cancelled_at: NullableTimestamp;
  completed_at: NullableTimestamp;
}

export interface HandoverRecordsTable {
  id: Generated<string>;
  rental_id: string;
  type: HandoverType;
  linked_record_id: Nullable<string>;
  performed_by: string;
  confirmed_by: Nullable<string>;
  confirmed_at: NullableTimestamp;
  condition_notes: Nullable<string>;
  serial_number_confirmed: Nullable<boolean>;
  accessories_confirmed: Nullable<unknown>;
  status: Generated<HandoverStatus>;
  created_at: GeneratedTimestamp;
}

export interface HandoverMediaTable {
  id: Generated<string>;
  handover_record_id: string;
  step: HandoverStep;
  media_type: MediaType;
  url: string;
  uploaded_by: string;
  created_at: GeneratedTimestamp;
}

export interface DamageReportsTable {
  id: Generated<string>;
  rental_id: string;
  handover_record_id: Nullable<string>;
  reported_by: string;
  description: string;
  severity: Generated<DamageSeverity>;
  status: Generated<DamageStatus>;
  ai_flag: Nullable<unknown>;
  created_at: GeneratedTimestamp;
}

export interface ReviewsTable {
  id: Generated<string>;
  rental_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: Nullable<string>;
  visible_at: NullableTimestamp;
  created_at: GeneratedTimestamp;
}

export interface ConversationsTable {
  id: Generated<string>;
  rental_id: Nullable<string>;
  item_id: Nullable<string>;
  participant_one_id: string;
  participant_two_id: string;
  created_at: GeneratedTimestamp;
}

export interface MessagesTable {
  id: Generated<string>;
  conversation_id: string;
  sender_id: string;
  content: string;
  flagged: Generated<boolean>;
  read_at: NullableTimestamp;
  created_at: GeneratedTimestamp;
}

export interface DisputesTable {
  id: Generated<string>;
  rental_id: string;
  opened_by: string;
  reason: string;
  status: Generated<DisputeStatus>;
  resolution_notes: Nullable<string>;
  resolved_by: Nullable<string>;
  resolved_at: NullableTimestamp;
  created_at: GeneratedTimestamp;
}

export interface DisputeEvidenceTable {
  id: Generated<string>;
  dispute_id: string;
  uploaded_by: string;
  media_url: string;
  description: Nullable<string>;
  created_at: GeneratedTimestamp;
}

export interface NotificationsTable {
  id: Generated<string>;
  user_id: string;
  type: string;
  title: string;
  body: string;
  related_entity_type: Nullable<string>;
  related_entity_id: Nullable<string>;
  read_at: NullableTimestamp;
  created_at: GeneratedTimestamp;
}

export interface DepositHoldsTable {
  id: Generated<string>;
  rental_id: string;
  amount: string;
  status: Generated<DepositStatus>;
  claimed_amount: Nullable<string>;
  claim_reason: Nullable<string>;
  released_at: NullableTimestamp;
  created_at: GeneratedTimestamp;
}

export interface PaymentsTable {
  id: Generated<string>;
  rental_id: string;
  type: PaymentType;
  amount: string;
  status: Generated<PaymentStatus>;
  provider: Nullable<string>;
  provider_reference: Nullable<string>;
  created_at: GeneratedTimestamp;
}

export interface AdminActionsTable {
  id: Generated<string>;
  admin_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  notes: Nullable<string>;
  created_at: GeneratedTimestamp;
}

export interface FavoritesTable {
  user_id: string;
  item_id: string;
  created_at: Generated<Date>;
}

export interface Database {
  users: UsersTable;
  refresh_tokens: RefreshTokensTable;
  verification_codes: VerificationCodesTable;
  categories: CategoriesTable;
  items: ItemsTable;
  item_accessories: ItemAccessoriesTable;
  item_images: ItemImagesTable;
  item_availability_blocks: ItemAvailabilityBlocksTable;
  favorites: FavoritesTable;
  rentals: RentalsTable;
  handover_records: HandoverRecordsTable;
  handover_media: HandoverMediaTable;
  damage_reports: DamageReportsTable;
  reviews: ReviewsTable;
  conversations: ConversationsTable;
  messages: MessagesTable;
  disputes: DisputesTable;
  dispute_evidence: DisputeEvidenceTable;
  notifications: NotificationsTable;
  deposit_holds: DepositHoldsTable;
  payments: PaymentsTable;
  admin_actions: AdminActionsTable;
}

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;
