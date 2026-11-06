BEGIN;
CREATE TABLE wallet_invitation (
 invitation_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 wallet_id bigint NOT NULL REFERENCES shared_wallet(shared_wallet_id),
 invited_by bigint NOT NULL REFERENCES users(user_id),
 phone text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days',
 responded_at timestamptz
);
CREATE UNIQUE INDEX one_pending_invitation ON wallet_invitation(wallet_id,phone) WHERE status='pending';
ALTER TABLE expense_share ADD COLUMN request_id bigint UNIQUE REFERENCES payment_request(request_id);
ALTER TABLE expense_share ADD COLUMN settled boolean NOT NULL DEFAULT false;
ALTER TABLE category ADD COLUMN owner_user_id bigint REFERENCES users(user_id);
ALTER TABLE category ADD COLUMN active boolean NOT NULL DEFAULT true;
CREATE UNIQUE INDEX user_category_name ON category(owner_user_id,lower(name));
INSERT INTO category(name,kind,icon,color) VALUES
 ('Food & dining','expense','utensils','peach'),('Travel','expense','compass','lilac'),
 ('Home','expense','home','sage'),('Shopping','expense','bag','peach'),('Other','expense','grid','sage');
COMMIT;
