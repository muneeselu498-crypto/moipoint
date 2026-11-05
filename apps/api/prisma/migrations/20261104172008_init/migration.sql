-- CreateTable
CREATE TABLE "SyncCounter" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "rev" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "SyncCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformDoc" (
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformDoc_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "plan" TEXT NOT NULL DEFAULT 'free',
    "ownerId" TEXT,
    "wallet" JSONB NOT NULL,
    "data" JSONB NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "email" TEXT,
    "username" TEXT NOT NULL,
    "mobile" TEXT,
    "role" TEXT NOT NULL,
    "platformRole" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "passwordHash" TEXT,
    "data" JSONB NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "no" TEXT NOT NULL,
    "token" TEXT,
    "date" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "moiSeq" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventUser" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Moi" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "mobile" TEXT,
    "status" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Moi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestGroup" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "ownerId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "eventId" TEXT,
    "ownerId" TEXT,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dispatchedAt" TIMESTAMP(3),
    "data" JSONB NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MsgLog" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "eventId" TEXT,
    "data" JSONB NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MsgLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "eventId" TEXT,
    "data" JSONB NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "mobile" TEXT NOT NULL,
    "accounts" TEXT[],
    "data" JSONB NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("mobile")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAlert" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "data" JSONB NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "impersonatorId" TEXT,
    "remember" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT '',
    "codeHash" TEXT NOT NULL,
    "tries" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "ticketHash" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT,
    "accountId" TEXT,
    "eventId" TEXT,
    "trigger" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "vars" JSONB,
    "media" JSONB,
    "paidBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "provider" TEXT,
    "providerRef" TEXT,
    "error" TEXT,
    "logId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTxn" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "kind" TEXT NOT NULL,
    "ref" TEXT,
    "code" TEXT,
    "by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTxn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "ref" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_rev_idx" ON "Account"("rev");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_accountId_idx" ON "User"("accountId");

-- CreateIndex
CREATE INDEX "User_mobile_idx" ON "User"("mobile");

-- CreateIndex
CREATE INDEX "User_rev_idx" ON "User"("rev");

-- CreateIndex
CREATE UNIQUE INDEX "Event_no_key" ON "Event"("no");

-- CreateIndex
CREATE UNIQUE INDEX "Event_token_key" ON "Event"("token");

-- CreateIndex
CREATE INDEX "Event_accountId_idx" ON "Event"("accountId");

-- CreateIndex
CREATE INDEX "Event_rev_idx" ON "Event"("rev");

-- CreateIndex
CREATE INDEX "EventUser_eventId_idx" ON "EventUser"("eventId");

-- CreateIndex
CREATE INDEX "EventUser_userId_idx" ON "EventUser"("userId");

-- CreateIndex
CREATE INDEX "EventUser_rev_idx" ON "EventUser"("rev");

-- CreateIndex
CREATE UNIQUE INDEX "Moi_code_key" ON "Moi"("code");

-- CreateIndex
CREATE INDEX "Moi_accountId_idx" ON "Moi"("accountId");

-- CreateIndex
CREATE INDEX "Moi_mobile_idx" ON "Moi"("mobile");

-- CreateIndex
CREATE INDEX "Moi_rev_idx" ON "Moi"("rev");

-- CreateIndex
CREATE UNIQUE INDEX "Moi_eventId_seq_key" ON "Moi"("eventId", "seq");

-- CreateIndex
CREATE INDEX "Expense_eventId_idx" ON "Expense"("eventId");

-- CreateIndex
CREATE INDEX "Expense_rev_idx" ON "Expense"("rev");

-- CreateIndex
CREATE INDEX "Payout_eventId_idx" ON "Payout"("eventId");

-- CreateIndex
CREATE INDEX "Payout_rev_idx" ON "Payout"("rev");

-- CreateIndex
CREATE INDEX "Guest_accountId_idx" ON "Guest"("accountId");

-- CreateIndex
CREATE INDEX "Guest_rev_idx" ON "Guest"("rev");

-- CreateIndex
CREATE INDEX "GuestGroup_accountId_idx" ON "GuestGroup"("accountId");

-- CreateIndex
CREATE INDEX "GuestGroup_rev_idx" ON "GuestGroup"("rev");

-- CreateIndex
CREATE INDEX "Reminder_ownerId_idx" ON "Reminder"("ownerId");

-- CreateIndex
CREATE INDEX "Reminder_rev_idx" ON "Reminder"("rev");

-- CreateIndex
CREATE INDEX "Notification_accountId_idx" ON "Notification"("accountId");

-- CreateIndex
CREATE INDEX "Notification_eventId_idx" ON "Notification"("eventId");

-- CreateIndex
CREATE INDEX "Notification_ownerId_idx" ON "Notification"("ownerId");

-- CreateIndex
CREATE INDEX "Notification_rev_idx" ON "Notification"("rev");

-- CreateIndex
CREATE INDEX "MsgLog_accountId_idx" ON "MsgLog"("accountId");

-- CreateIndex
CREATE INDEX "MsgLog_rev_idx" ON "MsgLog"("rev");

-- CreateIndex
CREATE INDEX "Audit_accountId_idx" ON "Audit"("accountId");

-- CreateIndex
CREATE INDEX "Audit_rev_idx" ON "Audit"("rev");

-- CreateIndex
CREATE INDEX "Person_rev_idx" ON "Person"("rev");

-- CreateIndex
CREATE INDEX "Ticket_accountId_idx" ON "Ticket"("accountId");

-- CreateIndex
CREATE INDEX "Ticket_rev_idx" ON "Ticket"("rev");

-- CreateIndex
CREATE INDEX "Lead_rev_idx" ON "Lead"("rev");

-- CreateIndex
CREATE INDEX "StockAlert_rev_idx" ON "StockAlert"("rev");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "OtpCode_purpose_target_scope_idx" ON "OtpCode"("purpose", "target", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "Message_notificationId_key" ON "Message"("notificationId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "Message_accountId_idx" ON "Message"("accountId");

-- CreateIndex
CREATE INDEX "Message_providerRef_idx" ON "Message"("providerRef");

-- CreateIndex
CREATE INDEX "CreditTxn_accountId_idx" ON "CreditTxn"("accountId");

-- CreateIndex
CREATE INDEX "Payment_accountId_idx" ON "Payment"("accountId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
