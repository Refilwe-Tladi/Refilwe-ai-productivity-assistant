import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const requestSchema = z.object({
  tool: z.enum(["email", "notes", "planner", "research", "chat"]),
  prompt: z.string().trim().min(1).max(20000),
  context: z.string().max(20000).optional(),
});

const instructions = {
  email:
    "You are a senior workplace communications editor. Draft a polished email using the supplied recipient, goal, tone, and context. Include a concise subject line. Return only the editable email draft.",
  notes:
    "You summarize workplace meetings. Produce concise sections titled Summary, Decisions, Action items, and Open questions. Preserve names, dates, metrics, and uncertainty. Never invent details.",
  planner:
    "You are a pragmatic workplace planning assistant. Turn the goal into a prioritized, realistic plan with numbered tasks, time estimates, dependencies, and a clear first action. Avoid filler.",
  research:
    "You are a careful research assistant. Create a useful briefing from the supplied topic and context. Separate established facts, assumptions, questions to verify, and recommended next steps. Do not invent citations or claim live browsing.",
  chat:
    "You are Veridian, a concise workplace productivity assistant. Give practical, specific help. State uncertainty, protect confidential information, and never pretend to have completed actions you cannot perform.",
} as const;

function gatewayError(status: number, message: string) {
  return Response.json(
    { error: message || "The AI request could not be completed." },
    { status },
  );
}

export const Route = createFileRoute("/api/assist")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let input: z.infer<typeof requestSchema>;
        try {
          input = requestSchema.parse(await request.json());
        } catch {
          return gatewayError(400, "Please complete the required fields and try again.");
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return gatewayError(500, "AI is not configured for this workspace.");

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            instructions: instructions[input.tool],
            input: input.context
              ? `${input.prompt}\n\nAdditional context:\n${input.context}`
              : input.prompt,
            stream: true,
            reasoning: { effort: "low", summary: "auto" },
            include: ["reasoning.encrypted_content"],
          }),
          signal: request.signal,
        }).catch((error: unknown) => {
          if (request.signal.aborted) return null;
          throw error;
        });

        if (!upstream) return new Response(null, { status: 499 });
        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          let message = detail;
          try {
            const parsed = JSON.parse(detail) as { message?: string; error?: { message?: string } };
            message = parsed.message ?? parsed.error?.message ?? detail;
          } catch {
            // Keep the provider's plain-text explanation.
          }
          return gatewayError(upstream.status, message);
        }

        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffered = "";
        const stream = new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            buffered += decoder.decode(chunk, { stream: true });
            const events = buffered.split("\n\n");
            buffered = events.pop() ?? "";
            for (const event of events) {
              for (const line of event.split("\n")) {
                if (!line.startsWith("data: ")) continue;
                const raw = line.slice(6);
                if (raw === "[DONE]") continue;
                try {
                  const data = JSON.parse(raw) as { type?: string; delta?: string };
                  if (data.type === "response.output_text.delta" && data.delta) {
                    controller.enqueue(encoder.encode(data.delta));
                  }
                } catch {
                  // Ignore non-JSON keepalive events.
                }
              }
            }
          },
        });

        const headers = new Headers({
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        });
        const runId = upstream.headers.get("X-Lovable-AIG-Run-ID");
        if (runId) {
          headers.set("X-Lovable-AIG-Run-ID", runId);
          headers.set("Access-Control-Expose-Headers", "X-Lovable-AIG-Run-ID");
        }
        return new Response(upstream.body.pipeThrough(stream), { headers });
      },
    },
  },
});