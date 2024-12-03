import { createCallerFactory, createTRPCRouter } from "@/server/trpc";
import { getPostRouter } from "./routers/post";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  get: createTRPCRouter({
    post: getPostRouter,
  }),
  create: createTRPCRouter({}),
  update: createTRPCRouter({}),
  delete: createTRPCRouter({}),
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
