export const DATABASE_VERSION = 9;

export const schemaV2 = `
CREATE UNIQUE INDEX IF NOT EXISTS idx_bill_instances_uniqueness ON bill_cycle_instances(bill_id, paycheck_cycle_id, due_date) WHERE deleted_at IS NULL;
`;

export const schemaV3 = `
ALTER TABLE import_suggestions ADD COLUMN suggestion_kind TEXT NOT NULL DEFAULT 'bill' CHECK (suggestion_kind IN ('bill', 'income'));
ALTER TABLE import_suggestions ADD COLUMN suggested_date TEXT;
`;

export const schemaV4 = `
ALTER TABLE profiles ADD COLUMN opening_balance_cents INTEGER NOT NULL DEFAULT 0;
`;

export const schemaV5 = `
ALTER TABLE paychecks ADD COLUMN is_primary INTEGER NOT NULL DEFAULT 1 CHECK (is_primary IN (0, 1));
`;

export const schemaV6 = `
ALTER TABLE profiles ADD COLUMN tutorial_complete INTEGER NOT NULL DEFAULT 0 CHECK (tutorial_complete IN (0, 1));
UPDATE profiles SET tutorial_complete = 1 WHERE onboarding_complete = 1;
`;

export const schemaV7 = `
ALTER TABLE profiles ADD COLUMN opening_balance_as_of_date TEXT;
UPDATE profiles
SET opening_balance_as_of_date = date(updated_at)
WHERE onboarding_complete = 1
  AND opening_balance_as_of_date IS NULL;
`;

export const schemaV8 = `
UPDATE profiles
SET opening_balance_as_of_date = updated_at
WHERE onboarding_complete = 1
  AND opening_balance_as_of_date IS NOT NULL
  AND length(opening_balance_as_of_date) = 10;
`;

export const schemaV9 = `
CREATE TABLE IF NOT EXISTS budgeting_preferences (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL UNIQUE REFERENCES profiles(id),
  envelopes_enabled INTEGER NOT NULL DEFAULT 0 CHECK (envelopes_enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending', 'synced'))
);

CREATE TABLE IF NOT EXISTS envelopes (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  allocation_cents INTEGER NOT NULL CHECK (allocation_cents >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_paused INTEGER NOT NULL DEFAULT 0 CHECK (is_paused IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending', 'synced'))
);

ALTER TABLE purchases ADD COLUMN envelope_id TEXT REFERENCES envelopes(id);

CREATE TABLE sync_queue_v9 (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('profile', 'paycheck', 'bill', 'bill_cycle_instance', 'purchase', 'balance_adjustment', 'notification_settings', 'budgeting_preferences', 'envelope')),
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'synced', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_attempt_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL
);

INSERT INTO sync_queue_v9 SELECT * FROM sync_queue;
DROP TABLE sync_queue;
ALTER TABLE sync_queue_v9 RENAME TO sync_queue;

CREATE INDEX IF NOT EXISTS idx_budgeting_preferences_profile ON budgeting_preferences(profile_id);
CREATE INDEX IF NOT EXISTS idx_envelopes_profile ON envelopes(profile_id, deleted_at, sort_order);
CREATE INDEX IF NOT EXISTS idx_purchases_envelope ON purchases(envelope_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_pending ON sync_queue(profile_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id);
`;

export const schemaV1 = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  essential_reserve INTEGER NOT NULL DEFAULT 0 CHECK (essential_reserve >= 0),
  currency_code TEXT NOT NULL DEFAULT 'USD',
  onboarding_complete INTEGER NOT NULL DEFAULT 0 CHECK (onboarding_complete IN (0, 1)),
  opening_balance_cents INTEGER NOT NULL DEFAULT 0,
  opening_balance_as_of_date TEXT,
  tutorial_complete INTEGER NOT NULL DEFAULT 0 CHECK (tutorial_complete IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending', 'synced'))
);

CREATE TABLE IF NOT EXISTS paychecks (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  label TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  expected_date TEXT NOT NULL,
  is_received INTEGER NOT NULL DEFAULT 0 CHECK (is_received IN (0, 1)),
  received_at TEXT,
  is_recurring INTEGER NOT NULL DEFAULT 0 CHECK (is_recurring IN (0, 1)),
  recurrence_interval TEXT CHECK (recurrence_interval IN ('weekly', 'biweekly', 'semimonthly', 'monthly') OR recurrence_interval IS NULL),
  is_primary INTEGER NOT NULL DEFAULT 1 CHECK (is_primary IN (0, 1)),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending', 'synced')),
  CHECK ((is_recurring = 0 AND recurrence_interval IS NULL) OR (is_recurring = 1 AND recurrence_interval IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  bill_type TEXT NOT NULL CHECK (bill_type IN ('fixed', 'variable')),
  default_amount_cents INTEGER NOT NULL CHECK (default_amount_cents >= 0),
  recurrence_interval TEXT NOT NULL CHECK (recurrence_interval IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'custom')),
  custom_interval_days INTEGER CHECK (custom_interval_days > 0 OR custom_interval_days IS NULL),
  due_day_of_cycle INTEGER,
  due_date_absolute TEXT,
  end_date TEXT,
  is_paused INTEGER NOT NULL DEFAULT 0 CHECK (is_paused IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending', 'synced')),
  CHECK ((recurrence_interval = 'custom' AND custom_interval_days IS NOT NULL) OR (recurrence_interval != 'custom' AND custom_interval_days IS NULL)),
  CHECK ((due_day_of_cycle IS NOT NULL AND due_date_absolute IS NULL) OR (due_day_of_cycle IS NULL AND due_date_absolute IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS bill_cycle_instances (
  id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL REFERENCES bills(id),
  paycheck_cycle_id TEXT NOT NULL REFERENCES paychecks(id),
  cycle_amount_cents INTEGER NOT NULL CHECK (cycle_amount_cents >= 0),
  is_variable_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (is_variable_confirmed IN (0, 1)),
  is_paid INTEGER NOT NULL DEFAULT 0 CHECK (is_paid IN (0, 1)),
  paid_at TEXT,
  due_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending', 'synced'))
);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  state TEXT NOT NULL DEFAULT 'charged' CHECK (state IN ('charged', 'pending')),
  description TEXT,
  purchase_date TEXT NOT NULL,
  paycheck_cycle_id TEXT REFERENCES paychecks(id),
  envelope_id TEXT REFERENCES envelopes(id),
  resolved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending', 'synced'))
);

CREATE TABLE IF NOT EXISTS balance_adjustments (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  previous_balance_cents INTEGER NOT NULL,
  adjusted_balance_cents INTEGER NOT NULL,
  delta_cents INTEGER NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending', 'synced'))
);

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('purchase_added', 'purchase_updated', 'purchase_deleted', 'purchase_state_changed', 'paycheck_confirmed', 'paycheck_adjusted', 'paycheck_added', 'paycheck_deleted', 'bill_added', 'bill_updated', 'bill_paused', 'bill_resumed', 'bill_deleted', 'bill_paid', 'variable_bill_confirmed', 'balance_adjusted', 'reserve_updated', 'import_completed', 'backup_exported', 'backup_restored')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('purchase', 'paycheck', 'bill', 'bill_instance', 'balance', 'import', 'backup')),
  entity_id TEXT,
  summary TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_settings (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL UNIQUE REFERENCES profiles(id),
  notifications_enabled INTEGER NOT NULL DEFAULT 1 CHECK (notifications_enabled IN (0, 1)),
  pending_purchase_reminder INTEGER NOT NULL DEFAULT 1 CHECK (pending_purchase_reminder IN (0, 1)),
  pending_reminder_days INTEGER NOT NULL DEFAULT 7 CHECK (pending_reminder_days > 0),
  low_balance_alert INTEGER NOT NULL DEFAULT 1 CHECK (low_balance_alert IN (0, 1)),
  upcoming_bill_reminder INTEGER NOT NULL DEFAULT 1 CHECK (upcoming_bill_reminder IN (0, 1)),
  bill_reminder_days_before INTEGER NOT NULL DEFAULT 2 CHECK (bill_reminder_days_before > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending', 'synced'))
);

CREATE TABLE IF NOT EXISTS budgeting_preferences (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL UNIQUE REFERENCES profiles(id),
  envelopes_enabled INTEGER NOT NULL DEFAULT 0 CHECK (envelopes_enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending', 'synced'))
);

CREATE TABLE IF NOT EXISTS envelopes (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  allocation_cents INTEGER NOT NULL CHECK (allocation_cents >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_paused INTEGER NOT NULL DEFAULT 0 CHECK (is_paused IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending', 'synced'))
);

CREATE TABLE IF NOT EXISTS import_suggestions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  suggested_name TEXT NOT NULL,
  suggested_amount_cents INTEGER NOT NULL CHECK (suggested_amount_cents > 0),
  suggestion_kind TEXT NOT NULL DEFAULT 'bill' CHECK (suggestion_kind IN ('bill', 'income')),
  suggested_date TEXT,
  detected_interval TEXT NOT NULL CHECK (detected_interval IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'irregular')),
  occurrence_count INTEGER NOT NULL CHECK (occurrence_count > 0),
  import_session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  confirmed_bill_id TEXT REFERENCES bills(id),
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS backup_metadata (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('export', 'restore')),
  file_name TEXT,
  record_count INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('profile', 'paycheck', 'bill', 'bill_cycle_instance', 'purchase', 'balance_adjustment', 'notification_settings', 'budgeting_preferences', 'envelope')),
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'synced', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_attempt_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_paychecks_profile_date ON paychecks(profile_id, expected_date, deleted_at);
CREATE INDEX IF NOT EXISTS idx_bills_profile ON bills(profile_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_bill_instances_cycle ON bill_cycle_instances(paycheck_cycle_id, due_date, deleted_at);
CREATE INDEX IF NOT EXISTS idx_bill_instances_bill ON bill_cycle_instances(bill_id, deleted_at);
${schemaV2}
CREATE INDEX IF NOT EXISTS idx_purchases_profile_date ON purchases(profile_id, purchase_date, deleted_at);
CREATE INDEX IF NOT EXISTS idx_purchases_pending ON purchases(profile_id, state, deleted_at);
CREATE INDEX IF NOT EXISTS idx_purchases_cycle ON purchases(paycheck_cycle_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_import_suggestions_session ON import_suggestions(import_session_id, status);
CREATE INDEX IF NOT EXISTS idx_activity_log_profile ON activity_log(profile_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_settings_profile ON notification_settings(profile_id);
CREATE INDEX IF NOT EXISTS idx_budgeting_preferences_profile ON budgeting_preferences(profile_id);
CREATE INDEX IF NOT EXISTS idx_envelopes_profile ON envelopes(profile_id, deleted_at, sort_order);
CREATE INDEX IF NOT EXISTS idx_purchases_envelope ON purchases(envelope_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_pending ON sync_queue(profile_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id);
`;
