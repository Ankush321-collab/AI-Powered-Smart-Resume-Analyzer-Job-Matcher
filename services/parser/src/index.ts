import dotenv from "dotenv";
import http from "http";
import path from "path";
import { createConsumer, publishEvent, TOPICS } from "@resume-analyser/kafka";
import { prisma } from "@resume-analyser/db";
import type { ResumeUploadedEvent, ResumeParsedEvent } from "@resume-analyser/types";
import axios from "axios";
import pdfParse from "pdf-parse";

dotenv.config({ path: path.join(__dirname, "../.env") });

const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS || 15000);

function startHealthServer(serviceName: string): void {
  const port = Number(process.env.PORT || 0);
  if (!port) return;

  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, service: serviceName }));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`[${serviceName}] Health server listening on port ${port}`);
  });
}

async function parseResume(payload: ResumeUploadedEvent): Promise<void> {
  const { resumeId, userId, fileUrl, fileName, jobId } = payload;
  console.log(`[Parser] Processing resume ${resumeId}`);

  try {
    const existing = await prisma.resume.findUnique({ where: { id: resumeId } });
    if (!existing) {
      console.warn(`[Parser] Resume ${resumeId} not found. Skipping stale event.`);
      return;
    }

    await prisma.resume.update({
      where: { id: resumeId },
      data: { status: "PARSING" },
    });

    let parsedText = "";

    if (typeof fileUrl === "string" && fileUrl.startsWith("http")) {
      try {
        // Download the file and parse
        const response = await axios.get(fileUrl, {
          responseType: "arraybuffer",
          timeout: HTTP_TIMEOUT_MS,
        });
        const buffer = Buffer.from(response.data);
        const data = await pdfParse(buffer);
        parsedText = data.text;
      } catch (downloadErr) {
        throw new Error(`Remote PDF fetch/parse failed: ${(downloadErr as Error).message}`);
      }
    } else {
      throw new Error("Unsupported file URL format. Expected an http(s) URL");
    }

    if (!parsedText || !parsedText.trim()) {
      throw new Error("Parsed text is empty");
    }

    await prisma.resume.update({
      where: { id: resumeId },
      data: { parsedText, status: "PARSED" },
    });

    const event: ResumeParsedEvent = { resumeId, userId, parsedText, jobId };
    await publishEvent(TOPICS.RESUME_PARSED, event as unknown as Record<string, unknown>);
    console.log(`[Parser] ✅ Resume ${resumeId} parsed successfully`);
  } catch (err) {
    console.error(`[Parser] ❌ Error parsing ${resumeId}:`, err);
    await prisma.resume
      .update({ where: { id: resumeId }, data: { status: "FAILED" } })
      .catch(() => undefined);
  }
}

async function main() {
  console.log("[Parser Service] Starting...");
  startHealthServer("Parser Service");
  await createConsumer(
    `${process.env.KAFKA_GROUP_ID_PREFIX}parser`,
    TOPICS.RESUME_UPLOADED,
    (payload) => parseResume(payload as unknown as ResumeUploadedEvent)
  );
  console.log("[Parser Service] ✅ Listening for resume_uploaded events");
}

main().catch(console.error);
