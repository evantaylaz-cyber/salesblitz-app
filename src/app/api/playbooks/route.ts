import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// GET — fetch all run requests that have competitive playbook assets
// Groups by target company for the playbook viewer page
export async function GET() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch all completed/delivered requests that would have competitive data
    const requests = await prisma.runRequest.findMany({
      where: {
        userId: user.id,
        status: { in: ["ready", "delivered"] },
        toolName: {
          in: [
            "interview_outreach",
            "interview_prep",
            "prospect_outreach",
            "prospect_prep",
            "champion_builder",
            "competitor_research",
          ],
        },
      },
      select: {
        id: true,
        toolName: true,
        targetName: true,
        targetCompany: true,
        targetRole: true,
        status: true,
        assets: true,
        createdAt: true,
        completedAt: true,
        deliveredAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter to only requests that have a competitive playbook asset
    const playbooks = requests
      .map((req) => {
        const assets = req.assets as Record<string, string> | null;
        if (!assets || typeof assets !== "object") return null;

        // Check for playbook asset (worker stores as competitivePlaybook)
        const playbookUrl =
          assets.competitivePlaybook || assets.competitive_playbook;
        // Include if has playbook
        if (!playbookUrl) return null;

        return {
          id: req.id,
          toolName: req.toolName,
          targetName: req.targetName,
          targetCompany: req.targetCompany,
          targetRole: req.targetRole,
          status: req.status,
          playbookUrl: playbookUrl || null,
          createdAt: req.createdAt,
          completedAt: req.completedAt,
          deliveredAt: req.deliveredAt,
        };
      })
      .filter(Boolean);

    // Group by target company
    const grouped: Record<
      string,
      {
        company: string;
        runs: typeof playbooks;
        latestRun: string;
        hasPlaybook: boolean;
      }
    > = {};

    for (const pb of playbooks) {
      if (!pb) continue;
      const key = pb.targetCompany.toLowerCase().trim();
      if (!grouped[key]) {
        grouped[key] = {
          company: pb.targetCompany,
          runs: [],
          latestRun: pb.createdAt.toISOString(),
          hasPlaybook: false,
        };
      }
      grouped[key].runs.push(pb);
      if (pb.playbookUrl) grouped[key].hasPlaybook = true;
      if (pb.createdAt.toISOString() > grouped[key].latestRun) {
        grouped[key].latestRun = pb.createdAt.toISOString();
      }
    }

    // Sort groups by latest run date
    const companies = Object.values(grouped).sort(
      (a, b) => new Date(b.latestRun).getTime() - new Date(a.latestRun).getTime()
    );

    return NextResponse.json({ companies, totalRuns: playbooks.length });
  } catch (error) {
    console.error("Fetch playbooks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch playbooks" },
      { status: 500 }
    );
  }
}
