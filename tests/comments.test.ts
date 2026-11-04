import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "./helpers";
import { reportComment } from "@/lib/comments";

const AUTO_HIDE = 3;

async function fixtures() {
  const store = await prisma.store.create({
    data: { name: "Comment Store", isDemo: true },
  });
  const author = await prisma.user.create({
    data: { email: "author@test.local", displayName: "Author" },
  });
  const comment = await prisma.comment.create({
    data: { storeId: store.id, userId: author.id, body: "test comment" },
  });
  const reporters = [];
  for (let i = 0; i < 3; i++) {
    reporters.push(
      await prisma.user.create({
        data: { email: `rep${i}@test.local`, displayName: `Rep ${i}` },
      })
    );
  }
  return { store, author, comment, reporters };
}

describe("comment report dedupe / auto-hide (anti-abuse)", () => {
  beforeEach(resetDb);

  it("one user reporting repeatedly counts once and never auto-hides alone", async () => {
    const { comment, reporters } = await fixtures();
    for (let i = 0; i < 10; i++) {
      const r = await reportComment(comment.id, reporters[0].id, AUTO_HIDE);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.hidden).toBe(false);
    }
    const after = await prisma.comment.findUnique({ where: { id: comment.id } });
    expect(after!.status).toBe("VISIBLE");
    expect(after!.reportCount).toBe(1);
  });

  it("auto-hides only at N distinct reporters", async () => {
    const { comment, reporters } = await fixtures();
    await reportComment(comment.id, reporters[0].id, AUTO_HIDE);
    await reportComment(comment.id, reporters[1].id, AUTO_HIDE);
    let c = await prisma.comment.findUnique({ where: { id: comment.id } });
    expect(c!.status).toBe("VISIBLE");

    const third = await reportComment(comment.id, reporters[2].id, AUTO_HIDE);
    expect(third.ok && third.hidden).toBe(true);
    c = await prisma.comment.findUnique({ where: { id: comment.id } });
    expect(c!.status).toBe("HIDDEN");
    expect(c!.reportCount).toBe(3);
  });

  it("authors cannot report their own comments", async () => {
    const { comment, author } = await fixtures();
    const r = await reportComment(comment.id, author.id, AUTO_HIDE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });

  it("hidden or missing comments return 404", async () => {
    const { comment, reporters } = await fixtures();
    await prisma.comment.update({ where: { id: comment.id }, data: { status: "HIDDEN" } });
    const r = await reportComment(comment.id, reporters[0].id, AUTO_HIDE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
    const r2 = await reportComment("nonexistent", reporters[0].id, AUTO_HIDE);
    expect(r2.ok).toBe(false);
  });
});
