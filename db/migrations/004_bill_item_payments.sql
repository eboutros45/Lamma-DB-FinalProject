BEGIN;
-- Existing collection wallets retain their custom-contribution workflow.
ALTER TABLE bill ADD COLUMN split_method text NOT NULL DEFAULT 'custom'
 CHECK (split_method IN ('custom','items'));
ALTER TABLE bill ADD COLUMN split_revision integer NOT NULL DEFAULT 0;
ALTER TABLE bill_item_selection ADD COLUMN quantity numeric(19,4) CHECK(quantity > 0);
CREATE TABLE bill_share_payment (
 bill_id bigint NOT NULL REFERENCES bill(bill_id),
 user_id bigint NOT NULL REFERENCES users(user_id),
 transaction_id bigint NOT NULL UNIQUE REFERENCES wallet_transaction(transaction_id),
 amount numeric(19,4) NOT NULL CHECK(amount > 0),
 paid_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(bill_id,user_id)
);
CREATE INDEX bill_share_payment_user ON bill_share_payment(user_id);
COMMIT;
