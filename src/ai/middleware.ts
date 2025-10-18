// import { Redis } from "@upstash/redis";
// import {
//   type LanguageModel,
//   type LanguageModelMiddleware,
//   type LanguageModelV2StreamPart,
//   simulateReadableStream,
// } from "ai";

// const redis = new Redis({
//   url: process.env.KV_URL,
//   token: process.env.KV_TOKEN,
// });

// export const cacheMiddleware: LanguageModelMiddleware = {
//   wrapGenerate: async ({ doGenerate, params }) => {
//     const cacheKey = JSON.stringify(params);

//     const cached = (await redis.get(cacheKey)) as Awaited<
//       ReturnType<LanguageModel["doGenerate"]>
//     > | null;

//     if (cached !== null) {
//       return {
//         ...cached,
//         response: {
//           ...cached.response,
//           timestamp: cached?.response?.timestamp
//             ? new Date(cached?.response?.timestamp)
//             : undefined,
//         },
//       };
//     }

//     const result = await doGenerate();

//     redis.set(cacheKey, result);

//     return result;
//   },
//   wrapStream: async ({ doStream, params }) => {
//     const cacheKey = JSON.stringify(params);

//     // Check if the result is in the cache
//     const cached = await redis.get(cacheKey);

//     // If cached, return a simulated ReadableStream that yields the cached result
//     if (cached !== null) {
//       // Format the timestamps in the cached response
//       const formattedChunks = (cached as LanguageModelV2StreamPart[]).map(
//         (p) => {
//           if (p.type === "response-metadata" && p.timestamp) {
//             return { ...p, timestamp: new Date(p.timestamp) };
//           } else return p;
//         }
//       );
//       return {
//         stream: simulateReadableStream({
//           initialDelayInMs: 0,
//           chunkDelayInMs: 10,
//           chunks: formattedChunks,
//         }),
//       };
//     }

//     // If not cached, proceed with streaming
//     const { stream, ...rest } = await doStream();

//     const fullResponse: LanguageModelV2StreamPart[] = [];

//     const transformStream = new TransformStream<
//       LanguageModelV2StreamPart,
//       LanguageModelV2StreamPart
//     >({
//       transform(chunk, controller) {
//         fullResponse.push(chunk);
//         controller.enqueue(chunk);
//       },
//       flush() {
//         // Store the full response in the cache after streaming is complete
//         redis.set(cacheKey, fullResponse);
//       },
//     });

//     return {
//       stream: stream.pipeThrough(transformStream),
//       ...rest,
//     };
//   },
// };
