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
    user = await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || null,
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

  return user;
}
