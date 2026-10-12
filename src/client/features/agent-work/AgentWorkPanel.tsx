import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAgentWork,
  startAgentWork,
  compareOrganicPeriods,
  reviewLearningPattern,
} from "@/serverFunctions/agentWork";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { SectionHeader } from "@/client/components/PageHeader";
import { QueryState } from "@/client/components/QueryState";

export function AgentWorkPanel({ projectId }: { projectId: string }) {
  const cache = useQueryClient();
  const queryKey = ["agent-work", projectId];
  const query = useQuery({
    queryKey,
    queryFn: () => listAgentWork({ data: { projectId } }),
    staleTime: 0,
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const refresh = () => cache.invalidateQueries({ queryKey });
  const start = useMutation({
    mutationFn: () =>
      startAgentWork({
        data: {
          projectId,
          requestKey: crypto.randomUUID(),
          goal: "Compare organic clicks and impressions with the preceding equally long period",
          startDate,
          endDate,
          contextChars: 12000,
          outputTokens: 2000,
        },
      }),
    onSuccess: refresh,
  });
  const compare = useMutation({
    mutationFn: (runId: string) =>
      compareOrganicPeriods({ data: { projectId, runId } }),
    onSuccess: (data) => {
      setResult(data.evidence.content);
      void refresh();
    },
  });
  const review = useMutation({
    mutationFn: ({
      candidateId,
      decision,
    }: {
      candidateId: string;
      decision: "approve" | "reject";
    }) =>
      reviewLearningPattern({
        data: {
          projectId,
          candidateId,
          decision,
          confirmsNoClientIdentifiers: true,
        },
      }),
    onSuccess: () => {
      setConfirmed(null);
      void refresh();
    },
  });
  const busy = start.isPending || compare.isPending || review.isPending;

  return (
    <section className="space-y-4" aria-labelledby="agent-work-heading">
      <SectionHeader
        title="Agent work & learning"
        hint="Continue the same project work in Codex or here. Raw evidence stays in this project; only reviewed generalizations enter workspace learning."
      />
      <h3 id="agent-work-heading" className="text-base font-medium">
        Compare organic traffic
      </h3>
      <p className="max-w-prose text-sm text-muted-foreground">
        Choose up to 90 days of final Search Console data. The comparison uses
        the preceding period of the same length. No paid research or backend AI
        calls.
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          start.mutate();
        }}
      >
        <label className="space-y-1 text-sm">
          Start date
          <Input
            type="date"
            required
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          End date
          <Input
            type="date"
            required
            min={startDate || undefined}
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>
        <Button type="submit" disabled={busy || !startDate || !endDate}>
          {start.isPending ? "Creating…" : "Create work item"}
        </Button>
      </form>
      {(start.isError || compare.isError || review.isError) && (
        <p role="alert" className="text-sm text-destructive">
          The operation could not finish. Check the date range, project
          connection or review permissions, then refresh before retrying.
        </p>
      )}
      <QueryState
        query={query}
        errorFallback="Could not load work items. Refresh to retry."
      >
        {(data) => (
          <div className="space-y-6">
            {data.runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No work items yet. Create one here or use start_seo_work in
                Codex.
              </p>
            ) : (
              <ul className="divide-y">
                {data.runs.map((run) => (
                  <li key={run.id} className="space-y-2 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium">
                          {run.goal}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {run.startDate} → {run.endDate} · {run.status} ·
                          context ≤ {run.contextChars.toLocaleString()}{" "}
                          characters
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        disabled={
                          busy || !["ready", "completed"].includes(run.status)
                        }
                        onClick={() => compare.mutate(run.id)}
                      >
                        {compare.isPending && compare.variables === run.id
                          ? "Comparing…"
                          : run.status === "completed"
                            ? "Read comparison"
                            : "Run comparison"}
                      </Button>
                    </div>
                    {run.checkpoint && (
                      <p className="max-w-prose whitespace-pre-wrap break-words text-sm">
                        {run.checkpoint}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {result && (
              <details open className="space-y-2">
                <summary className="cursor-pointer text-sm font-medium">
                  Saved comparison evidence
                </summary>
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-4 text-xs">
                  {JSON.stringify(JSON.parse(result), null, 2)}
                </pre>
              </details>
            )}
            <div className="space-y-3">
              <h3 className="text-base font-medium">Learning candidates</h3>
              <p className="max-w-prose text-sm text-muted-foreground">
                Candidates are private to this project. An owner or admin must
                check that names, identifiers, private metrics and source
                material have been removed before sharing a generalization
                across clients, markets or industries.
              </p>
              {data.candidates.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No candidates awaiting review. Codex can propose a mechanism
                  with applicability and exceptions using
                  propose_learning_pattern.
                </p>
              )}
              <ul className="divide-y">
                {data.candidates.map((candidate) => (
                  <li key={candidate.id} className="space-y-3 py-4">
                    <p className="max-w-prose whitespace-pre-wrap break-words text-sm font-medium">
                      {candidate.mechanism}
                    </p>
                    <dl className="max-w-prose space-y-2 text-sm">
                      <div>
                        <dt className="font-medium">Applies when</dt>
                        <dd className="break-words">
                          {candidate.applicability}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium">Exceptions</dt>
                        <dd className="break-words">{candidate.exceptions}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Market / industry</dt>
                        <dd>
                          {candidate.market} / {candidate.industry}
                        </dd>
                      </div>
                    </dl>
                    {data.canReview && (
                      <>
                        <label className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="mt-1 accent-primary"
                            checked={confirmed === candidate.id}
                            onChange={(event) =>
                              setConfirmed(
                                event.target.checked ? candidate.id : null,
                              )
                            }
                          />
                          I checked all fields: this contains no client
                          identifiers or private source data.
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            disabled={
                              busy ||
                              confirmed !== candidate.id ||
                              candidate.status === "rejecting"
                            }
                            onClick={() =>
                              review.mutate({
                                candidateId: candidate.id,
                                decision: "approve",
                              })
                            }
                          >
                            Approve generalized pattern
                          </Button>
                          <Button
                            variant="outline"
                            disabled={busy || candidate.status === "approving"}
                            onClick={() =>
                              review.mutate({
                                candidateId: candidate.id,
                                decision: "reject",
                              })
                            }
                          >
                            Reject candidate
                          </Button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </QueryState>
    </section>
  );
}
