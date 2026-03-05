import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const TOOL_NAMES: Record<string, string> = {
  interview_outreach: "Interview Outreach",
  prospect_outreach: "Prospect Outreach",
  interview_prep: "Interview Prep",
  prospect_prep: "Prospect Prep",
  deal_audit: "Deal Audit",
  champion_builder: "Champion Builder",
};

const TOOL_DELIVERABLES: Record<string, string[]> = {
  interview_outreach: [
    "Optimized resume",
    "Cold outreach sequences",
    "Target company mapping",
    "Networking playbook",
  ],
  prospect_outreach: [
    "Account targeting & ICP mapping",
    "Multi-channel sequences",
    "Personalization frameworks",
    "Objection handling",
  ],
  interview_prep: [
    "Qualification mapping",
    "STAR story library",
    "Objection scripts",
    "Competitive intel",
    "30/60/90 plan",
    "Discovery questions",
  ],
  prospect_prep: [
    "Account research & org chart",
    "Discovery call plan",
    "Competitive positioning",
    "Business case frameworks",
  ],
  deal_audit: [
    "Qualification scorecard",
    "Risk report",
    "Deal health card",
    "Strategy brief",
    "Discovery questions",
  ],
  champion_builder: [
    "Champion profile",
    "Stakeholder map",
    "Development plan",
    "Internal selling kit",
    "Coaching card",
  ],
};

interface OrderDetails {
  requestId: string;
  toolName: string;
  targetName: string;
  targetCompany: string;
  targetRole?: string | null;
  jobDescription?: string | null;
  linkedinUrl?: string | null;
  additionalNotes?: string | null;
  priority: boolean;
  customerEmail?: string | null;
  customerName?: string | null;
}

export async function sendOrderNotification(order: OrderDetails) {
  const toolLabel = TOOL_NAMES[order.toolName] || order.toolName;
  const deliverables = TOOL_DELIVERABLES[order.toolName] || [];

  const priorityBadge = order.priority
    ? '<span style="background:#f59e0b;color:#fff;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">⚡ PRIORITY</span>'
    : "";

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#4f46e5;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;font-size:20px;">New Order Received ${priorityBadge}</h1>
        <p style="margin:4px 0 0;opacity:0.9;font-size:14px;">${toolLabel} — ${order.targetCompany}</p>
      </div>

      <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
        <h2 style="margin:0 0 16px;font-size:16px;color:#111827;">Target Details</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:8px 12px;background:#f9fafb;font-weight:600;width:140px;border:1px solid #e5e7eb;">Name</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;">${order.targetName}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb;">Company</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;">${order.targetCompany}</td>
          </tr>
          ${order.targetRole ? `<tr>
            <td style="padding:8px 12px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb;">Role</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;">${order.targetRole}</td>
          </tr>` : ""}
          ${order.linkedinUrl ? `<tr>
            <td style="padding:8px 12px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb;">LinkedIn</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;"><a href="${order.linkedinUrl}" style="color:#4f46e5;">${order.linkedinUrl}</a></td>
          </tr>` : ""}
          ${order.customerName ? `<tr>
            <td style="padding:8px 12px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb;">Customer</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;">${order.customerName}${order.customerEmail ? ` (${order.customerEmail})` : ""}</td>
          </tr>` : ""}
        </table>

        ${order.jobDescription ? `
        <h2 style="margin:20px 0 8px;font-size:16px;color:#111827;">Job Description</h2>
        <div style="background:#f9fafb;padding:12px;border-radius:8px;font-size:13px;color:#374151;white-space:pre-wrap;max-height:300px;overflow:auto;">${order.jobDescription}</div>
        ` : ""}

        ${order.additionalNotes ? `
        <h2 style="margin:20px 0 8px;font-size:16px;color:#111827;">Additional Notes</h2>
        <div style="background:#f9fafb;padding:12px;border-radius:8px;font-size:13px;color:#374151;">${order.additionalNotes}</div>
        ` : ""}

        <h2 style="margin:20px 0 8px;font-size:16px;color:#111827;">Deliverables to Fulfill</h2>
        <ul style="margin:0;padding:0 0 0 20px;font-size:14px;color:#374151;">
          ${deliverables.map((d) => `<li style="padding:4px 0;">${d}</li>`).join("")}
        </ul>

        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;">
          <a href="https://app.alternativeinvestments.io/admin"
             style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            Open Admin Queue →
          </a>
          <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">Request ID: ${order.requestId}</p>
        </div>
      </div>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "AltVest Orders <onboarding@resend.dev>",
      to: [
        "evan@alternativeinvestments.io",
        "evan.tay.laz@gmail.com",
      ],
      subject: `${order.priority ? "⚡ " : ""}New ${toolLabel} Order — ${order.targetName} @ ${order.targetCompany}`,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error("Email send error:", err);
    return { success: false, error: err };
  }
}

// ── Team Invite Email ──────────────────────────────────────────────────

interface InviteDetails {
  inviteEmail: string;
  teamName: string;
  teamId: string;
  inviterName: string;
  role: string;
  memberId: string;
}

export async function sendTeamInviteEmail(invite: InviteDetails) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.alternativeinvestments.io";
  const acceptUrl = `${appUrl}/teams/invite?teamId=${invite.teamId}&email=${encodeURIComponent(invite.inviteEmail)}`;

  const roleLabel = invite.role === "admin" ? "an Admin" : "a Member";

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#4f46e5;color:#fff;padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;font-size:22px;">You're invited to join a team on AltVest</h1>
      </div>

      <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
        <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
          <strong>${invite.inviterName}</strong> invited you to join <strong>${invite.teamName}</strong> as ${roleLabel}.
        </p>

        <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 24px;">
          As a team member, you'll get access to shared intel runs, knowledge base docs, and competitive playbooks. Your team's subscription covers your usage.
        </p>

        <div style="text-align:center;margin:24px 0;">
          <a href="${acceptUrl}"
             style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
            Accept Invite
          </a>
        </div>

        <p style="font-size:12px;color:#9ca3af;text-align:center;margin:16px 0 0;">
          If you don't have an AltVest account yet, you'll be prompted to create one first.
        </p>
      </div>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "AltVest <onboarding@resend.dev>",
      to: [invite.inviteEmail],
      subject: `${invite.inviterName} invited you to ${invite.teamName} on AltVest`,
      html,
    });

    if (error) {
      console.error("Invite email error:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error("Invite email send error:", err);
    return { success: false, error: err };
  }
}
