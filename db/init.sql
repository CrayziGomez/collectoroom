-- Collectoroom PostgreSQL Schema
-- Migration from Firestore
-- Generated: 2026-03-12

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS (extends Clerk user data)
-- ============================================
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,  -- Clerk user ID
  plan_id VARCHAR(50) DEFAULT 'free',
  card_count INTEGER DEFAULT 0,
  collection_count INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT FALSE,
  following_count INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User follow relationships
CREATE TABLE user_follows (
  follower_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100) DEFAULT 'Layers3',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default categories
INSERT INTO categories (name, description, icon) VALUES
  ('Trading Cards', 'Sports cards, TCG, and collectible cards', 'Layers3'),
  ('Coins & Currency', 'Numismatic collections', 'Gem'),
  ('Stamps', 'Philatelic collections', 'Ticket'),
  ('Art', 'Fine art and prints', 'Palette'),
  ('Books', 'Rare books and first editions', 'BookOpen'),
  ('Music', 'Vinyl, CDs, and memorabilia', 'Music'),
  ('Photography', 'Vintage and collectible photos', 'Camera');

-- ============================================
-- COLLECTIONS
-- ============================================
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  card_count INTEGER DEFAULT 0,
  cover_image TEXT,
  cover_image_hint TEXT,
  keywords TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_collections_user ON collections(user_id);
CREATE INDEX idx_collections_category ON collections(category_id);
CREATE INDEX idx_collections_public ON collections(is_public) WHERE is_public = TRUE;

-- ============================================
-- CARDS
-- ============================================
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) CHECK (status IN ('Display only', 'For sale', 'For rent', 'Previously owned', 'Wish list', '')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cards_collection ON cards(collection_id);
CREATE INDEX idx_cards_user ON cards(user_id);

-- Card images (replaces Firestore images[] array)
CREATE TABLE card_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  hint TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_card_images_card ON card_images(card_id);

-- ============================================
-- SITE CONTENT (CMS)
-- ============================================
CREATE TABLE site_content (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'content',
  title TEXT,
  subtitle TEXT,
  hero_image_url TEXT,
  hero_image_path TEXT,
  how_it_works_steps JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default content
INSERT INTO site_content (id, title, subtitle) VALUES
  ('content', 'Welcome to Collectoroom', 'Organize, showcase, and connect with fellow collectors.');

-- ============================================
-- CHATS & MESSAGES
-- ============================================
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_ids VARCHAR(255)[] NOT NULL,
  participants JSONB DEFAULT '{}'::jsonb,
  last_message JSONB,
  unread_count JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chats_participants ON chats USING GIN (participant_ids);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_messages_chat_time ON messages(chat_id, created_at DESC);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id VARCHAR(255) NOT NULL,
  sender_id VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255),
  type VARCHAR(50) NOT NULL CHECK (type IN ('NEW_FOLLOWER', 'NEW_COLLECTION')),
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read) WHERE is_read = FALSE;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_content_updated_at BEFORE UPDATE ON site_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
