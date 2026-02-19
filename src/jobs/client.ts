import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "glueos",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
