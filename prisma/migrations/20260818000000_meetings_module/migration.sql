-- ============================================================================
-- Submodulo PAUTAS DE REUNIOES (dentro de Anotacoes)
--
-- Migration ADITIVA. Contem exclusivamente CREATE TABLE, CREATE INDEX e
-- ADD CONSTRAINT (foreign keys) para as 7 tabelas novas do modulo.
--
-- NAO contem DROP, TRUNCATE, DELETE nem ALTER de tabela existente.
-- Nenhum dado de Note/NoteTag/NoteAttachment/NoteAiMessage/NoteHistory e tocado.
--
-- Observacao sobre datas: campos visiveis ao usuario (date, startTime, endTime,
-- dueDate) sao TEXT (YYYY-MM-DD / HH:MM) para eliminar conversao de timezone.
-- Apenas timestamps de auditoria usam TIMESTAMP.
-- ============================================================================

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT,
    "type" TEXT NOT NULL DEFAULT 'EQUIPE',
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "category" TEXT,
    "date" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "location" TEXT,
    "meetingUrl" TEXT,
    "recurrence" TEXT DEFAULT 'NENHUMA',
    "observations" TEXT,
    "finalSummary" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "organizerId" TEXT,
    "duplicatedFromId" TEXT,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "MeetingParticipant" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "teamMemberId" TEXT,
    "externalName" TEXT,
    "externalEmail" TEXT,
    "externalRole" TEXT,
    "attendanceStatus" TEXT NOT NULL DEFAULT 'CONVIDADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingParticipant_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "MeetingAgendaItem" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discussion" TEXT,
    "estimatedMinutes" INTEGER,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'NAO_INICIADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "presenterId" TEXT,

    CONSTRAINT "MeetingAgendaItem_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "MeetingDecision" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "agendaItemId" TEXT,
    "description" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingDecision_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "MeetingAction" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "agendaItemId" TEXT,
    "description" TEXT NOT NULL,
    "responsibleId" TEXT,
    "support" TEXT,
    "dueDate" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'A_FAZER',
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingAction_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "MeetingAttachment" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingAttachment_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "MeetingHistory" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingHistory_pkey" PRIMARY KEY ("id")
);


-- CreateIndex
CREATE INDEX "Meeting_date_idx" ON "Meeting"("date");


-- CreateIndex
CREATE INDEX "Meeting_status_idx" ON "Meeting"("status");


-- CreateIndex
CREATE INDEX "Meeting_organizerId_idx" ON "Meeting"("organizerId");


-- CreateIndex
CREATE INDEX "Meeting_archivedAt_idx" ON "Meeting"("archivedAt");


-- CreateIndex
CREATE INDEX "MeetingParticipant_meetingId_idx" ON "MeetingParticipant"("meetingId");


-- CreateIndex
CREATE INDEX "MeetingParticipant_teamMemberId_idx" ON "MeetingParticipant"("teamMemberId");


-- CreateIndex
CREATE UNIQUE INDEX "MeetingParticipant_meetingId_teamMemberId_key" ON "MeetingParticipant"("meetingId", "teamMemberId");


-- CreateIndex
CREATE INDEX "MeetingAgendaItem_meetingId_idx" ON "MeetingAgendaItem"("meetingId");


-- CreateIndex
CREATE INDEX "MeetingAgendaItem_meetingId_order_idx" ON "MeetingAgendaItem"("meetingId", "order");


-- CreateIndex
CREATE INDEX "MeetingDecision_meetingId_idx" ON "MeetingDecision"("meetingId");


-- CreateIndex
CREATE INDEX "MeetingDecision_agendaItemId_idx" ON "MeetingDecision"("agendaItemId");


-- CreateIndex
CREATE INDEX "MeetingAction_meetingId_idx" ON "MeetingAction"("meetingId");


-- CreateIndex
CREATE INDEX "MeetingAction_agendaItemId_idx" ON "MeetingAction"("agendaItemId");


-- CreateIndex
CREATE INDEX "MeetingAction_responsibleId_idx" ON "MeetingAction"("responsibleId");


-- CreateIndex
CREATE INDEX "MeetingAction_status_idx" ON "MeetingAction"("status");


-- CreateIndex
CREATE INDEX "MeetingAttachment_meetingId_idx" ON "MeetingAttachment"("meetingId");


-- CreateIndex
CREATE INDEX "MeetingHistory_meetingId_idx" ON "MeetingHistory"("meetingId");


-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_duplicatedFromId_fkey" FOREIGN KEY ("duplicatedFromId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "MeetingParticipant" ADD CONSTRAINT "MeetingParticipant_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "MeetingParticipant" ADD CONSTRAINT "MeetingParticipant_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "MeetingAgendaItem" ADD CONSTRAINT "MeetingAgendaItem_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "MeetingAgendaItem" ADD CONSTRAINT "MeetingAgendaItem_presenterId_fkey" FOREIGN KEY ("presenterId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "MeetingDecision" ADD CONSTRAINT "MeetingDecision_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "MeetingDecision" ADD CONSTRAINT "MeetingDecision_agendaItemId_fkey" FOREIGN KEY ("agendaItemId") REFERENCES "MeetingAgendaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "MeetingAction" ADD CONSTRAINT "MeetingAction_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "MeetingAction" ADD CONSTRAINT "MeetingAction_agendaItemId_fkey" FOREIGN KEY ("agendaItemId") REFERENCES "MeetingAgendaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "MeetingAction" ADD CONSTRAINT "MeetingAction_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "MeetingAction" ADD CONSTRAINT "MeetingAction_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "MeetingAttachment" ADD CONSTRAINT "MeetingAttachment_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "MeetingHistory" ADD CONSTRAINT "MeetingHistory_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;


