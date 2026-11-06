ALTER TABLE users ADD COLUMN password_hash text;
ALTER TABLE users ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE wallet ADD COLUMN currency text NOT NULL DEFAULT 'USD' CHECK (currency = 'USD');
ALTER TABLE wallet ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE shared_wallet ADD COLUMN expires_at timestamptz;
ALTER TABLE expense ADD COLUMN owner_user_id bigint REFERENCES users(user_id);
ALTER TABLE expense ADD COLUMN status text NOT NULL DEFAULT 'unpaid';
CREATE TABLE business_access (
 business_id bigint REFERENCES business(business_id), user_id bigint REFERENCES users(user_id),
 role text NOT NULL CHECK (role IN ('owner','manager','cashier','viewer')), PRIMARY KEY (business_id,user_id)
);
CREATE TABLE expense_share (
 expense_id bigint REFERENCES expense(expense_id), user_id bigint REFERENCES users(user_id),
 amount numeric(19,4) NOT NULL CHECK (amount > 0), PRIMARY KEY(expense_id,user_id)
);
CREATE TABLE sessions (token_hash text PRIMARY KEY, user_id bigint NOT NULL REFERENCES users(user_id), expires_at timestamptz NOT NULL);
CREATE TABLE operation (
 user_id bigint REFERENCES users(user_id), key text NOT NULL, fingerprint text NOT NULL,
 response jsonb NOT NULL, PRIMARY KEY(user_id,key)
);
CREATE TABLE ledger_entry (
 entry_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 transaction_id bigint NOT NULL REFERENCES wallet_transaction(transaction_id),
 wallet_id bigint REFERENCES wallet(wallet_id),
 amount numeric(19,4) NOT NULL CHECK (amount <> 0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_wallet_idx ON ledger_entry(wallet_id);
CREATE TABLE audit_event (
 event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id bigint REFERENCES users(user_id), action text NOT NULL,
 details jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
-- Posted journals are balanced and append-only, including the external test-funding account.
CREATE FUNCTION check_journal_balance() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (SELECT count(*) < 2 OR sum(amount) <> 0 FROM ledger_entry WHERE transaction_id = NEW.transaction_id) THEN
  RAISE EXCEPTION 'Unbalanced journal';
 END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER journal_balanced AFTER INSERT ON ledger_entry
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_journal_balance();
CREATE FUNCTION reject_ledger_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Ledger entries are immutable'; END $$;
CREATE TRIGGER immutable_ledger BEFORE UPDATE OR DELETE ON ledger_entry FOR EACH ROW EXECUTE FUNCTION reject_ledger_change();
