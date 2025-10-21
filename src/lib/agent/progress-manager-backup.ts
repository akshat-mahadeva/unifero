// // lib/agent/progress-manager.ts
// import prisma from "@/lib/db";
// import { UIMessageStreamWriter } from "ai";

// export class DatabaseProgressManager {
//   constructor(private messageId: string, private sessionId: string) {}

//   /**
//    * Initialize progress tracking for a new deep search
//    * Stores totalSteps in the database
//    */
//   async initialize(searchCount: number) {
//     // 1 analysis + N searches + 1 synthesis + 1 report
//     const totalSteps = 1 + searchCount + 2;

//     await prisma.deepSearchMessage.update({
//       where: { id: this.messageId },
//       data: {
//         isDeepSearchInitiated: true,
//         progress: 0,
//         // Store totalSteps in a JSON field or add a column
//         metadata: {
//           totalSteps,
//           expectedSearches: searchCount,
//         },
//         updatedAt: new Date(),
//       },
//     });

//     return { totalSteps, completedSteps: 0, progress: 0 };
//   }

//   /**
//    * Get current progress state from database
//    * This reconstructs progress from actual step completion
//    */
//   async getState() {
//     const message = await prisma.deepSearchMessage.findUnique({
//       where: { id: this.messageId },
//       select: {
//         isDeepSearchInitiated: true,
//         completed: true,
//         metadata: true,
//         DeepSearchStep: {
//           select: {
//             id: true,
//             isExecuted: true,
//             type: true,
//           },
//         },
//       },
//     });

//     if (!message) {
//       throw new Error("Message not found");
//     }

//     if (!message.isDeepSearchInitiated) {
//       return {
//         totalSteps: 0,
//         completedSteps: 0,
//         progress: 0,
//         isDeepSearch: false,
//         isComplete: false,
//       };
//     }

//     // Get total steps from metadata or calculate from steps
//     const metadata = message.metadata as { totalSteps?: number } | null;
//     const totalSteps =
//       metadata?.totalSteps || message.DeepSearchStep.length || 4;

//     // Count completed steps
//     const completedSteps = message.DeepSearchStep.filter(
//       (step) => step.isExecuted
//     ).length;

//     // Calculate progress (cap at 95% until fully complete)
//     let progress = 0;
//     if (totalSteps > 0) {
//       progress = Math.min(95, Math.floor((completedSteps / totalSteps) * 100));
//     }

//     // If marked as complete, set to 100%
//     if (message.completed) {
//       progress = 100;
//     }

//     return {
//       totalSteps,
//       completedSteps,
//       progress,
//       isDeepSearch: true,
//       isComplete: message.completed,
//     };
//   }

//   /**
//    * Mark a step as completed and update progress
//    */
//   async completeStep(stepId: string) {
//     // Mark step as executed
//     await prisma.deepSearchStep.update({
//       where: { id: stepId },
//       data: {
//         isExecuted: true,
//         updatedAt: new Date(),
//       },
//     });

//     // Get updated state
//     const state = await this.getState();

//     // Update message progress
//     await prisma.deepSearchMessage.update({
//       where: { id: this.messageId },
//       data: {
//         progress: state.progress,
//         updatedAt: new Date(),
//       },
//     });

//     return state;
//   }

//   /**
//    * Mark the entire search as complete
//    */
//   async markComplete() {
//     await prisma.deepSearchMessage.update({
//       where: { id: this.messageId },
//       data: {
//         progress: 100,
//         completed: true,
//         updatedAt: new Date(),
//       },
//     });

//     return {
//       progress: 100,
//       isComplete: true,
//     };
//   }

//   /**
//    * Emit progress event to stream
//    */
//   async emitProgress(
//     writer: UIMessageStreamWriter,
//     text: string,
//     state?: "done"
//   ) {
//     const progressState = await this.getState();
//     writer.write({
//       type: "data-deepSearchDataPart",
//       id: `progress-${Date.now()}-${Math.random()}`,
//       data: {
//         id: `data-${Date.now()}`,
//         progress: progressState.progress,
//         messageId: this.messageId,
//         text,
//         state,
//         isDeepSearchInitiated: progressState.isDeepSearch,
//         completedSteps: progressState.completedSteps,
//         totalSteps: progressState.totalSteps,
//         type: "deep-search",
//       },
//     });
//   }
// }

// /**
//  * Create or restore progress manager from database
//  * This works even after page refresh!
//  */
// export async function createProgressManager(
//   messageId: string,
//   sessionId: string
// ) {
//   return new DatabaseProgressManager(messageId, sessionId);
// }
