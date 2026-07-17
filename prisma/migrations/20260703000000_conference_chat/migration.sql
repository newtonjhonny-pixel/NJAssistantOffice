-- Safe DDL only: create conference checklist chat table.

CREATE TABLE IF NOT EXISTS "ConferenceChat" (
  "id" TEXT NOT NULL,
  "conferenceId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "mode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ConferenceChat_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ConferenceChat_conferenceId_idx" ON "ConferenceChat"("conferenceId");

ALTER TABLE "ConferenceChat" ADD CONSTRAINT "ConferenceChat_conferenceId_fkey"
  FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;
