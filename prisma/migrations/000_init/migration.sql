-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT,
    "card_count" INTEGER NOT NULL DEFAULT 0,
    "collection_count" INTEGER NOT NULL DEFAULT 0,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "following_count" INTEGER NOT NULL DEFAULT 0,
    "followers_count" INTEGER NOT NULL DEFAULT 0,
    "avatar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_follows" (
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,
    "followed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("follower_id","following_id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT DEFAULT 'Layers3',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "category_id" TEXT,
    "card_count" INTEGER NOT NULL DEFAULT 0,
    "cover_image" TEXT,
    "cover_image_hint" TEXT,
    "keywords" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT,
    "category_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_images" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "hint" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_content" (
    "id" TEXT NOT NULL DEFAULT 'content',
    "title" TEXT,
    "subtitle" TEXT,
    "hero_image_url" TEXT,
    "hero_image_path" TEXT,
    "how_it_works_steps" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chats" (
    "id" TEXT NOT NULL,
    "participant_ids" TEXT[],
    "participants" JSONB,
    "last_message" JSONB,
    "unread_count" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "sender_name" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_collections_user" ON "collections"("user_id");

-- CreateIndex
CREATE INDEX "idx_collections_category" ON "collections"("category_id");

-- CreateIndex
CREATE INDEX "idx_cards_collection" ON "cards"("collection_id");

-- CreateIndex
CREATE INDEX "idx_cards_user" ON "cards"("user_id");

-- CreateIndex
CREATE INDEX "idx_card_images_card" ON "card_images"("card_id");

-- CreateIndex
CREATE INDEX "idx_messages_chat" ON "messages"("chat_id");

-- CreateIndex
CREATE INDEX "idx_messages_chat_time" ON "messages"("chat_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_notifications_recipient" ON "notifications"("recipient_id");

-- CreateIndex
CREATE INDEX "idx_notifications_unread" ON "notifications"("recipient_id", "is_read");

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_images" ADD CONSTRAINT "card_images_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

