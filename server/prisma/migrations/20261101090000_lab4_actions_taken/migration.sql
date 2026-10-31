-- Lab 4 migration: Actions Taken, append-only history, and Ticket.resolvedAt.
-- Additive only: no existing column is dropped or altered, so every Lab 3 User, Ticket,
-- Attachment, Public Comment, and Internal Note stays valid.
-- Recovery after a successful run is a restore of a pre-upgrade pg_dump (specification 7.4).

-- 1. Enums
CREATE TYPE "ActionStatus" AS ENUM ('Planned', 'In Progress', 'Completed', 'Cancelled');
CREATE TYPE "ActionRevisionType" AS ENUM ('CREATED', 'EDITED', 'STATUS_CHANGED', 'ASSIGNEE_CHANGED', 'AUTO_CANCELLED');
CREATE TYPE "TicketEventType" AS ENUM ('STATUS_CHANGED', 'OWNER_CHANGED', 'PRIORITY_CHANGED');

-- 2. Ticket.resolvedAt and dashboard indexes
ALTER TABLE "Ticket" ADD COLUMN "resolvedAt" TIMESTAMP(3);
CREATE INDEX "Ticket_status_updatedAt_idx" ON "Ticket"("status", "updatedAt");
CREATE INDEX "Ticket_requesterId_status_idx" ON "Ticket"("requesterId", "status");

-- 3. Backfill (best available evidence; Lab 3 did not record a resolution time, BR-27)
UPDATE "Ticket" SET "resolvedAt" = "updatedAt" WHERE "status" IN ('Resolved', 'Closed');

-- 4. ActionTaken
CREATE TABLE "ActionTaken" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "performedById" INTEGER NOT NULL,
    "assigneeId" INTEGER NOT NULL,
    "updatedById" INTEGER,
    "status" "ActionStatus" NOT NULL DEFAULT 'Completed',
    "actionAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "result" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpNote" TEXT,
    "attachmentNotes" TEXT,
    "clientRequestId" TEXT,
    "requestDigest" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionTaken_pkey" PRIMARY KEY ("id")
);

-- 5. ActionTakenRevision (insert-only)
CREATE TABLE "ActionTakenRevision" (
    "id" SERIAL NOT NULL,
    "actionId" INTEGER NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "revisionNo" INTEGER NOT NULL,
    "type" "ActionRevisionType" NOT NULL,
    "actorId" INTEGER NOT NULL,
    "changedFields" TEXT[],
    "before" JSONB,
    "after" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionTakenRevision_pkey" PRIMARY KEY ("id")
);

-- 6. TicketEvent (insert-only)
CREATE TABLE "TicketEvent" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "type" "TicketEventType" NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "actorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketEvent_pkey" PRIMARY KEY ("id")
);

-- 7. Indexes
CREATE UNIQUE INDEX "ActionTaken_ticketId_clientRequestId_key" ON "ActionTaken"("ticketId", "clientRequestId");
CREATE INDEX "ActionTaken_ticketId_actionAt_idx" ON "ActionTaken"("ticketId", "actionAt");
CREATE INDEX "ActionTaken_performedById_idx" ON "ActionTaken"("performedById");
CREATE INDEX "ActionTaken_assigneeId_status_idx" ON "ActionTaken"("assigneeId", "status");
CREATE INDEX "ActionTaken_ticketId_status_idx" ON "ActionTaken"("ticketId", "status");
CREATE UNIQUE INDEX "ActionTakenRevision_actionId_revisionNo_key" ON "ActionTakenRevision"("actionId", "revisionNo");
CREATE INDEX "ActionTakenRevision_ticketId_createdAt_idx" ON "ActionTakenRevision"("ticketId", "createdAt");
CREATE INDEX "TicketEvent_ticketId_createdAt_id_idx" ON "TicketEvent"("ticketId", "createdAt", "id");

-- 8. Foreign keys: ON DELETE RESTRICT everywhere (BR-40)
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTakenRevision" ADD CONSTRAINT "ActionTakenRevision_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "ActionTaken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTakenRevision" ADD CONSTRAINT "ActionTakenRevision_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTakenRevision" ADD CONSTRAINT "ActionTakenRevision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketEvent" ADD CONSTRAINT "TicketEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketEvent" ADD CONSTRAINT "TicketEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 9. Immutability (BR-37): history rows can be inserted but never updated or deleted.
-- TRUNCATE does not fire row-level triggers; it is used only by the guarded test cleanup (BR-40).
CREATE FUNCTION "reject_history_change"() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION '% rows are append-only: % is not permitted', TG_TABLE_NAME, TG_OP
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ActionTakenRevision_immutable"
    BEFORE UPDATE OR DELETE ON "ActionTakenRevision"
    FOR EACH ROW EXECUTE FUNCTION "reject_history_change"();

CREATE TRIGGER "TicketEvent_immutable"
    BEFORE UPDATE OR DELETE ON "TicketEvent"
    FOR EACH ROW EXECUTE FUNCTION "reject_history_change"();
