import express from "express";
import http from "http";
import { initSocket } from "./socket";
import Redis from "ioredis";
import dotenv from "dotenv";
import { ProjectDetails, TranscriptData } from "./types";
import prisma from "./prisma";
import { generateShorts } from "./controllers/model.controllers";
import { getShortDurations } from "./controllers/shorts.controllers";
import { generateAndStoreShorts } from "./controllers/video.controllers";
dotenv.config();

const REDIS_URL = process.env.REDIS_URL;

const app = express();
const server = http.createServer(app);

const redis = new Redis(REDIS_URL as string);

redis.on("connect", () => console.log("Connected to Redis"));
redis.on("error", (err) => console.error("Redis error:", err));
redis.on("close", () => console.log("Redis connection closed"));

const updateProjectStatus = async (projectId: string, status: "queued" | "analyzing" | "completed" | "failed", error?: string) => {
  try {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status,
      }
    });
  } catch (err) {
    console.error("Error updating project status:", err);
  }
};

const consumeQueue = async (queueName: string) => {
  while (true) {
    try {
      console.log("Waiting for jobs in queue:", queueName);
      const result = await redis.blpop(queueName, 0);
      if (result) {
        const [key, value] = result;
        const job: TranscriptData = JSON.parse(value);
        
        const { projectId } = job;        
        try {
          await updateProjectStatus(projectId, "analyzing");
          const ProjectDetails = await prisma.project.update({
            where: { id: projectId },
            data:{
              url:job.cloudinaryUrl as string,
              pubId:job.pub_id
            },
            select: {
              id: true,
              userId: true,
              config: true,
            }
          });
          console.log(ProjectDetails?.config);
          
          if (!ProjectDetails) {
            throw new Error("Project not found for ID: " + projectId);
          }
          
          const ShortContentInTranscripts = await generateShorts(job.text, ProjectDetails.config as unknown as ProjectDetails);
          const ShortWithDurations = getShortDurations(ShortContentInTranscripts, job.words);
          
          const shorts = ShortWithDurations.filter(
            (short) => short.from !== undefined && short.to !== undefined 
          );

          if (shorts.length === 0) {
            throw new Error("No valid shorts could be generated from the transcript");
          }
          const ShortsWithVideoUrl = await generateAndStoreShorts(shorts, ProjectDetails.config as unknown as ProjectDetails,job?.pub_id as string);
          console.log(ShortsWithVideoUrl.map((ec)=>ec.videoUrl));

          await prisma.short.createMany({
            data: ShortsWithVideoUrl.map((short) => ({
              projectId: projectId,
              url: short.videoUrl,
              title: short.title,
              highlightText: short.highlightText,
              from: short.from as number,
              to: short.to as number
            })) 
          });
            await updateProjectStatus(projectId, "completed");
          
        } catch (err) {
          console.error("Error processing job:", err);
          await updateProjectStatus(projectId, "failed", err instanceof Error ? err.message : "Unknown error occurred");
        }
      }
    } catch (err) {
      console.error("Error in queue processing:", err);
    }
  }
};

consumeQueue("video_process");

initSocket(server);

app.get("/health", (_req, res) => {
  res.send("Socket.IO Server Running");
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
