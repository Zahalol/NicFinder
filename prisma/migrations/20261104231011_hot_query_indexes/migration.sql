-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE INDEX "Comment_userId_createdAt_idx" ON "Comment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CoverageRequest_ipHash_idx" ON "CoverageRequest"("ipHash");

-- CreateIndex (CommentReport lookups by comment; table created in
-- 20261104224936_comment_report_dedupe)
CREATE INDEX "CommentReport_commentId_idx" ON "CommentReport"("commentId");
