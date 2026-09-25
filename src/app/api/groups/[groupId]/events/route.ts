import { getSession } from "@auth0/nextjs-auth0";
import { requireMember } from "@/server/utils/api/route-guards";
import { getActiveMembership } from "@/server/utils/group/get-active-membership";
import { subscribeToGroupEvents } from "@/server/events/event-broadcaster";

export const dynamic = "force-dynamic";

async function authenticateGroupMember(request: Request, groupId: string) {
  // 1. Check for Bearer token (Mobile app compatibility)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const memberAuth = await requireMember(request, groupId);
    if (!memberAuth.ok) return memberAuth;
    return { ok: true, userId: memberAuth.userId };
  }

  // 2. Check for web Auth0 session
  try {
    const session = await getSession();
    if (!session?.user?.sub) {
      return {
        ok: false,
        response: new Response("Unauthorized", { status: 401 }),
      };
    }

    const userId = session.user.sub;
    const membership = await getActiveMembership(groupId, userId);
    if (!membership) {
      return {
        ok: false,
        response: new Response("Forbidden: not a member of this group", {
          status: 403,
        }),
      };
    }

    return { ok: true, userId };
  } catch (error) {
    console.error("SSE auth error:", error);
    return {
      ok: false,
      response: new Response("Unauthorized", { status: 401 }),
    };
  }
}

export async function GET(
  request: Request,
  { params }: { params: { groupId: string } },
) {
  const { groupId } = params;
  const authResult = await authenticateGroupMember(request, groupId);
  if (!authResult.ok) {
    return authResult.response;
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connected event
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({ groupId, status: "connected" })}\n\n`,
        ),
      );

      // Subscribe to real-time events for this group
      unsubscribe = subscribeToGroupEvents(groupId, (event) => {
        try {
          const eventName = event.type.toLowerCase();
          const message = `event: ${eventName}\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (err) {
          console.error("Error enqueueing SSE event:", err);
        }
      });

      // Send periodic heartbeat ping to prevent connection timeout
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
        }
      }, 25000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    },
  });

  request.signal.addEventListener("abort", () => {
    if (unsubscribe) unsubscribe();
    if (heartbeatInterval) clearInterval(heartbeatInterval);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
