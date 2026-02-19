import { inngest } from "./client";
import { db } from "@/lib/db";

export const buildCarousel = inngest.createFunction(
  { id: "build-carousel", name: "Generate Carousel PDF" },
  { event: "glueos/build-carousel" },
  async ({ event, step }) => {
    const { postDraftId } = event.data;

    await step.run("generate-pdf", async () => {
      const draft = await db.postDraft.findUniqueOrThrow({
        where: { id: postDraftId },
        include: {
          carouselSlides: { orderBy: { slideNumber: "asc" } },
        },
      });

      if (draft.carouselSlides.length === 0) {
        return { skipped: true, reason: "No carousel slides" };
      }

      // PDF generation using @react-pdf/renderer would happen here.
      // In production, this would:
      // 1. Build a React PDF document from carousel slides
      // 2. Render to buffer using renderToBuffer
      // 3. Upload to Vercel Blob storage
      // 4. Store the URL on the draft record

      return { slideCount: draft.carouselSlides.length };
    });

    return { success: true };
  }
);
