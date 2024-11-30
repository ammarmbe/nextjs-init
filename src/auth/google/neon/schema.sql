CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  expires_at TIMESTAMP NOT NULL,
);

CREATE TABLE users (
  id UUID PRIMARY KEY,
  google_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  image TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
);