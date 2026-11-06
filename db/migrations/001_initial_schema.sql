-- PostgreSQL 16+. Initial translation of supplied CDM/LDM.
BEGIN;

CREATE TABLE users (
    user_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone text NOT NULL UNIQUE,
    first_name text NOT NULL,
    last_name text NOT NULL
);

CREATE TABLE wallet (
    wallet_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    personal_user_id bigint UNIQUE REFERENCES users(user_id),
    name text NOT NULL,
    balance numeric(19,4) NOT NULL DEFAULT 0,
    wallet_type text NOT NULL,
    status text NOT NULL,
    CHECK (balance >= 0)
);

CREATE TABLE shared_wallet (
    shared_wallet_id bigint PRIMARY KEY REFERENCES wallet(wallet_id),
    gift_recipient_id bigint REFERENCES users(user_id),
    purpose text NOT NULL,
    description text,
    target_amount numeric(19,4) CHECK (target_amount > 0)
);

CREATE TABLE shared_wallet_member (
    user_id bigint REFERENCES users(user_id),
    shared_wallet_id bigint REFERENCES shared_wallet(shared_wallet_id),
    member_role text NOT NULL,
    joined_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, shared_wallet_id)
);

CREATE TABLE business (
    business_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_user_id bigint NOT NULL REFERENCES users(user_id),
    wallet_id bigint NOT NULL UNIQUE REFERENCES wallet(wallet_id),
    display_name text NOT NULL,
    legal_name text NOT NULL,
    industry text,
    status text NOT NULL
);

CREATE TABLE category (
    category_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL,
    kind text NOT NULL,
    icon text,
    color text
);

CREATE TABLE wallet_transaction (
    transaction_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sender_wallet_id bigint REFERENCES wallet(wallet_id),
    receiver_wallet_id bigint REFERENCES wallet(wallet_id),
    category_id bigint REFERENCES category(category_id),
    reference_code text NOT NULL UNIQUE,
    amount numeric(19,4) NOT NULL CHECK (amount > 0),
    transaction_type text NOT NULL,
    status text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamptz,
    CHECK (sender_wallet_id IS NOT NULL OR receiver_wallet_id IS NOT NULL),
    CHECK (sender_wallet_id IS DISTINCT FROM receiver_wallet_id),
    CHECK (completed_at IS NULL OR completed_at >= created_at)
);

CREATE TABLE expense (
    expense_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    shared_wallet_id bigint REFERENCES shared_wallet(shared_wallet_id),
    category_id bigint REFERENCES category(category_id),
    transaction_id bigint UNIQUE REFERENCES wallet_transaction(transaction_id),
    title text NOT NULL,
    total_amount numeric(19,4) NOT NULL CHECK (total_amount > 0),
    split_method text NOT NULL,
    billing_period text,
    expense_date date NOT NULL,
    notes text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at timestamptz,
    CHECK (confirmed_at IS NULL OR confirmed_at >= created_at)
);

CREATE TABLE bill (
    bill_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id bigint NOT NULL REFERENCES business(business_id),
    shared_wallet_id bigint UNIQUE REFERENCES shared_wallet(shared_wallet_id),
    transaction_id bigint UNIQUE REFERENCES wallet_transaction(transaction_id),
    bill_code text NOT NULL UNIQUE,
    external_bill_id text,
    total_amount numeric(19,4) NOT NULL CHECK (total_amount >= 0),
    status text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at timestamptz,
    CHECK (paid_at IS NULL OR paid_at >= created_at)
);

CREATE TABLE bill_item (
    item_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bill_id bigint NOT NULL REFERENCES bill(bill_id),
    name text NOT NULL,
    quantity numeric(19,4) NOT NULL CHECK (quantity > 0),
    unit_price numeric(19,4) NOT NULL CHECK (unit_price >= 0)
);

CREATE TABLE bill_item_selection (
    user_id bigint REFERENCES users(user_id),
    item_id bigint REFERENCES bill_item(item_id),
    allocated_amount numeric(19,4) NOT NULL CHECK (allocated_amount > 0),
    PRIMARY KEY (user_id, item_id)
);

CREATE TABLE payment_request (
    request_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    requester_id bigint NOT NULL REFERENCES users(user_id),
    payer_id bigint REFERENCES users(user_id),
    destination_wallet_id bigint NOT NULL REFERENCES wallet(wallet_id),
    expense_id bigint REFERENCES expense(expense_id),
    transaction_id bigint UNIQUE REFERENCES wallet_transaction(transaction_id),
    amount numeric(19,4) NOT NULL CHECK (amount > 0),
    description text,
    status text NOT NULL,
    qr_type text,
    qr_token text UNIQUE,
    due_date timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at timestamptz,
    expires_at timestamptz,
    CHECK (responded_at IS NULL OR responded_at >= created_at),
    CHECK (expires_at IS NULL OR expires_at > created_at)
);

CREATE INDEX idx_shared_wallet_gift_recipient_id ON shared_wallet (gift_recipient_id);
CREATE INDEX idx_shared_wallet_member_shared_wallet_id ON shared_wallet_member (shared_wallet_id);
CREATE INDEX idx_business_owner_user_id ON business (owner_user_id);
CREATE INDEX idx_wallet_transaction_sender_wallet_id ON wallet_transaction (sender_wallet_id);
CREATE INDEX idx_wallet_transaction_receiver_wallet_id ON wallet_transaction (receiver_wallet_id);
CREATE INDEX idx_wallet_transaction_category_id ON wallet_transaction (category_id);
CREATE INDEX idx_expense_shared_wallet_id ON expense (shared_wallet_id);
CREATE INDEX idx_expense_category_id ON expense (category_id);
CREATE INDEX idx_bill_business_id ON bill (business_id);
CREATE INDEX idx_bill_item_bill_id ON bill_item (bill_id);
CREATE INDEX idx_bill_item_selection_item_id ON bill_item_selection (item_id);
CREATE INDEX idx_payment_request_requester_id ON payment_request (requester_id);
CREATE INDEX idx_payment_request_payer_id ON payment_request (payer_id);
CREATE INDEX idx_payment_request_destination_wallet_id ON payment_request (destination_wallet_id);
CREATE INDEX idx_payment_request_expense_id ON payment_request (expense_id);

COMMIT;
