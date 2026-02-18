import { serve } from "inngest/next";
import { inngest } from "@/jobs/client";
import { ingestFiles } from "@/jobs/ingest-files";
import { runScout } from "@/jobs/run-scout";
import { runArchitect } from "@/jobs/run-architect";
import { runGhostwriter } from "@/jobs/run-ghostwriter";
import { buildCarousel } from "@/jobs/build-carousel";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [ingestFiles, runScout, runArchitect, runGhostwriter, buildCarousel],
});
