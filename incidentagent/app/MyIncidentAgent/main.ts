import { BedrockAgentCoreApp } from "bedrock-agentcore/runtime";
import {
  Agent,
  McpClient,
  type ToolList,
  BeforeToolCallEvent,
  BeforeInvocationEvent,
} from "@strands-agents/sdk";
import { loadModel } from "./model/load.js";
import {
  checkFrontendHealthTool,
  checkElasticBeanstalkHealthTool,
  restartElasticBeanstalkEnvironmentTool,
  checkLambdaLogsTool,
  checkElasticBeanstalkLogsTool,
  investigationTimeline,
  investigationFindings,
} from "./configs/toolsConfig.js";
import { prompt } from "./configs/prompt.js";
import { createIncidentReport } from "./tools/createIncidentReport.js";
import {
  sendIncidentEmail,
  sendIncidentFailureEmail,
} from "./tools/sendIncidentEmail.js";

const mcpClients: McpClient[] = [];

// Define a collection of tools used by the model
const tools: ToolList = [
  checkFrontendHealthTool,
  checkElasticBeanstalkHealthTool,
  restartElasticBeanstalkEnvironmentTool,
  checkLambdaLogsTool,
  checkElasticBeanstalkLogsTool,
];

// Add MCP clients to tools
tools.push(...mcpClients);

const SYSTEM_PROMPT = prompt;
const MAX_TOOL_CALLS = 10; // maximum number of tool calls as a guardrail

let cachedAgent: Agent | null = null;

async function getOrCreateAgent(): Promise<Agent> {
  if (!cachedAgent) {
    const model = await loadModel();

    let toolCallCount = 0;

    cachedAgent = new Agent({
      model,
      systemPrompt: SYSTEM_PROMPT,
      tools,
    });
    cachedAgent.addHook(BeforeInvocationEvent, () => {
      toolCallCount = 0;
      investigationTimeline.length = 0;
      investigationFindings.length = 0;

      console.log("[TOOL LIMIT] Counter reset");
    });
    cachedAgent.addHook(BeforeToolCallEvent, () => {
      toolCallCount++;
      console.log(`[TOOL LIMIT] Tool call ${toolCallCount}/${MAX_TOOL_CALLS}`);

      if (toolCallCount > MAX_TOOL_CALLS) {
        console.log(
          `[TOOL LIMIT] Maximum tool limit (${MAX_TOOL_CALLS}) exceeded. Cancelling investigation.`,
        );

        cachedAgent?.cancel();
        return;
      }
    });
  }
  return cachedAgent;
}

async function runInvestigation(payload: any) {
  try {
    console.log("Creating agent...");
    const agent = await getOrCreateAgent();
    // throw new Error("Unexpected manual error");

    console.log("Invoking agent...");
    const response = await agent.invoke(payload.prompt ?? "", {
      cancelSignal: AbortSignal.timeout(10 * 60 * 1000), // 10 mins maximum runtime for agent
    });

    console.log("Agent response received");
    const interrupted = response.stopReason === "cancelled";

    let reportText = response
      .toString()
      .replace(/<thinking>[\s\S]*?<\/thinking>/g, "");

    if (interrupted) {
      reportText = `
        INVESTIGATION STATUS: INTERRUPTED

        Reason:
        Investigation exceeded configured execution limits and was stopped before completion.

        Findings collected so far:

        ${investigationFindings.map((f) => `- ${f}`).join("\n")}

        ------------------------------------------------------------
      `;
    }

    console.log("Creating incident report...");

    const report = await createIncidentReport(
      reportText,
      investigationTimeline,
    );

    console.log("Incident report created");

    await sendIncidentEmail({
      reportPath: report.filePath,
      reportFileName: report.fileName,
    });

    console.log("Email sent successfully");
  } catch (error) {
    console.error("=== RUNTIME ERROR ===");

    const message =
      error instanceof Error
        ? error.name === "AbortError"
          ? "Investigation timed out after 5 minutes"
          : error.message
        : JSON.stringify(error);

    await sendIncidentFailureEmail(message);

    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
    }

    throw error;
  }
}

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    async *process(payload: any, context: any) {
      console.log("=== INVOCATION START ===");
      console.log("Payload:");
      console.log(JSON.stringify(payload));

      // Start investigation without waiting
      runInvestigation(payload).catch((error) => {
        console.error("Background investigation failed:", error);
      });

      // Immediately acknowledge invocation
      yield {
        data: JSON.stringify({
          status: "ACCEPTED",
          timestamp: new Date().toISOString(),
        }),
      };

      console.log("Invocation accepted, investigation running in background");
    },
  },
});

console.log("RUNTIME BUILD VERSION 2026-06-06-1");

app.run({ port: parseInt(process.env.PORT ?? "8080") });
