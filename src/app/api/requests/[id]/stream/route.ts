import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { stepEventBus, StepEventPayload } from "@/lib/step-events";

// GET /api/requests/[id]/stream — SSE endpoint for real-time step updates
// Client connects via EventSource, receives step updates as they happen.
// Falls back gracefully: if SSE drops, client can re-fetch via GET /api/requests/[id].
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = params.id;

  // Verify request exists
  const request = await prisma.runRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true },
  });

  if (!request) {
    return new Response("Request not found", { status: 404 });
  }

  // If request is already terminal, no point streaming
  const terminalStatuses = ["delivered", "ready", "failed"];
  if (terminalStatuses.includes(request.status)) {
    return new Response("Request already complete", { status: 204 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", requestId })}\n\n`)
      );

      // Subscribe to step events for this request
      const unsubscribe = stepEventBus.subscribe(requestId, (data: StepEventPayload) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "step_update", ...data })}\n\n`)
          );

          // Close stream if request reached terminal state
          if (terminalStatuses.includes(data.status)) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "complete", status: data.status })}\n\n`)
            );
            unsubscribe();
            controller.close();
          }
        } catch {
          // Client disconnected
          unsubscribe();
        }
      });

      // Heartbeat every 15s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 15000);

      // Cleanup on abort (client disconnects)
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable Nginx buffering
    },
  });
}
