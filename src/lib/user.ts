import { currentUser } from "@clerk/nextjs/server";
import prisma from "./db";

/**
 * Get or create the database user from the current Clerk session.
 */
export async function getOrCreateUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  let user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    include: {
      runPacks: {
        where: {
          runsRemaining: { gt: 0 },
          expiresAt: { gt: new Date() },
        },
        orderBy: { expiresAt: "asc" },
      },
      runLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!user) {
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const name = `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || null;

    // Try to find by email first (handles Clerk key rotation where clerkId changes but email stays the same)
    const existingByEmail = email ? await prisma.user.findUnique({ where: { email } }) : null;

    if (existingByEmail) {
      // Update the existing record with the new clerkId
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: { clerkId: clerkUser.id, name: name ?? existingByEmail.name },
        include: {
          runPacks: {
            where: {
              runsRemaining: { gt: 0 },
              expiresAt: { gt: new Date() },
            },
            orderBy: { expiresAt: "asc" },
          },
          runLogs: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          email,
          name,
          currentTier: "pro",
          subscriptionRunsRemaining: 3,
          subscriptionRunsTotal: 3,
          subscriptionStatus: "active",
        },
        include: {
          runPacks: {
            where: {
              runsRemaining: { gt: 0 },
              expiresAt: { gt: new Date() },
            },
            orderBy: { expiresAt: "asc" },
          },
          runLogs: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      });
    }
  }

  return user;
}
