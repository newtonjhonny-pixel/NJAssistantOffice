-- Safe DDL only: add nullable vacation management fields.

ALTER TABLE "TeamVacation" ADD COLUMN IF NOT EXISTS "branch" TEXT;
ALTER TABLE "TeamVacation" ADD COLUMN IF NOT EXISTS "companyName" TEXT;
ALTER TABLE "TeamVacation" ADD COLUMN IF NOT EXISTS "acquisitionStartDate" TIMESTAMP(3);
ALTER TABLE "TeamVacation" ADD COLUMN IF NOT EXISTS "acquisitionEndDate" TIMESTAMP(3);
ALTER TABLE "TeamVacation" ADD COLUMN IF NOT EXISTS "concessionStartDate" TIMESTAMP(3);
ALTER TABLE "TeamVacation" ADD COLUMN IF NOT EXISTS "concessionEndDate" TIMESTAMP(3);
ALTER TABLE "TeamVacation" ADD COLUMN IF NOT EXISTS "vacationDays" INTEGER;
ALTER TABLE "TeamVacation" ADD COLUMN IF NOT EXISTS "hasBonus" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TeamVacation" ADD COLUMN IF NOT EXISTS "bonusDays" INTEGER;
ALTER TABLE "TeamVacation" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
