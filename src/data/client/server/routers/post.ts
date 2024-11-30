import { createTRPCRouter, publicProcedure } from "@/server/trpc";

export const getPostRouter = createTRPCRouter({
  all: publicProcedure.query(async () => {
    return "all posts";
  }),
});
