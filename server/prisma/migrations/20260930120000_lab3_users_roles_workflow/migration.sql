-- Lab 3 migration: Development Requester -> authenticated User model, ticket workflow,
-- Public Comments, and Internal Notes. Existing Lab 2 Categories, Related Systems,
-- Tickets, and Attachments are preserved in place.

-- 1. Roles
CREATE TYPE "UserRole" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');

-- 2. Evolve RequesterUser into User (keeps ids, so Ticket.requesterId stays correct)
ALTER TABLE "RequesterUser" RENAME TO "User";
ALTER TABLE "User" RENAME CONSTRAINT "RequesterUser_pkey" TO "User_pkey";
ALTER INDEX "RequesterUser_email_key" RENAME TO "User_email_key";
ALTER SEQUENCE "RequesterUser_id_seq" RENAME TO "User_id_seq";

-- Existing Lab 2 requesters receive the documented local-lab initial password "Welcome123!"
-- (bcrypt hash below) and must change it at their first login.
ALTER TABLE "User"
    ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '$2b$10$sLIW3Sedj.tnLSv8rS1XDOly3ZdBeC3tmK2uFBvZnc1ntESd2/gjK',
    ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'REQUESTER',
    ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- The defaults above only backfill migrated rows; new users always get explicit values.
ALTER TABLE "User"
    ALTER COLUMN "passwordHash" DROP DEFAULT,
    ALTER COLUMN "mustChangePassword" SET DEFAULT false,
    ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Ticket.requesterId now references "User" (the FK followed the table rename)

-- 3. Ticket priority: add URGENT
ALTER TYPE "TicketPriority" RENAME TO "TicketPriority_old";
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
ALTER TABLE "Ticket" ALTER COLUMN "requestedPriority" DROP DEFAULT;
ALTER TABLE "Ticket" ALTER COLUMN "requestedPriority" TYPE "TicketPriority" USING ("requestedPriority"::text::"TicketPriority");
ALTER TABLE "Ticket" ALTER COLUMN "requestedPriority" SET DEFAULT 'MEDIUM';
DROP TYPE "TicketPriority_old";

-- 4. Ticket status: Lab 3 workflow statuses. Lab 2 "Pending" becomes "In Progress".
ALTER TYPE "TicketStatus" RENAME TO "TicketStatus_old";
CREATE TYPE "TicketStatus" AS ENUM ('New', 'Open', 'In Progress', 'Waiting for Requester', 'Resolved', 'Closed', 'Reopened', 'Cancelled');
ALTER TABLE "Ticket" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Ticket" ALTER COLUMN "status" TYPE "TicketStatus" USING (
    CASE "status"::text WHEN 'Pending' THEN 'In Progress' ELSE "status"::text END
)::"TicketStatus";
ALTER TABLE "Ticket" ALTER COLUMN "status" SET DEFAULT 'New';
DROP TYPE "TicketStatus_old";

-- 5. Ticket ownership, IT Priority (initially copies Requested Priority), resolution indication
ALTER TABLE "Ticket"
    ADD COLUMN "itPriority" "TicketPriority",
    ADD COLUMN "indicatedResolvedAt" TIMESTAMP(3),
    ADD COLUMN "ownerId" INTEGER;

UPDATE "Ticket" SET "itPriority" = "requestedPriority" WHERE "itPriority" IS NULL;

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Ticket_requesterId_idx" ON "Ticket"("requesterId");
CREATE INDEX "Ticket_ownerId_idx" ON "Ticket"("ownerId");
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- 6. Attachment removal reason (Lab 2 soft-remove)
ALTER TABLE "Attachment" ADD COLUMN "removalReason" TEXT;
CREATE INDEX "Attachment_ticketId_idx" ON "Attachment"("ticketId");

-- 7. Public Comments and Internal Notes (append-only)
CREATE TABLE "PublicComment" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,

    CONSTRAINT "PublicComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InternalNote" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,

    CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PublicComment_ticketId_idx" ON "PublicComment"("ticketId");
CREATE INDEX "InternalNote_ticketId_idx" ON "InternalNote"("ticketId");

ALTER TABLE "PublicComment" ADD CONSTRAINT "PublicComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublicComment" ADD CONSTRAINT "PublicComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
