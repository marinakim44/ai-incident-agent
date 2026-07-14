import { tool } from "@strands-agents/sdk";
import { checkFrontendHealth } from "../tools/checkFrontendHealth.js";
import { checkElasticBeanstalkHealth } from "../tools/checkElasticBeanstalkHealth.js";
import { restartElasticBeanstalkEnvironment } from "../tools/restartElasticBeanstalkEnvironment.js";
import { createIncidentReport } from "../tools/createIncidentReport.js";
import { checkLambdaLogs } from "../tools/checkLambdaLogs.js";
import { canRestartEnvironment } from "../policies/remediationPolicy.js";
import { checkElasticBeanstalkLogs } from "../tools/checkElasticBeanstalkLogs.js";

// AI agent investigation timeline
export const investigationTimeline = [];
export const investigationFindings = [];

// tools definitions
const checkFrontendHealthTool = tool({
  name: "checkFrontendHealth",
  description: "Checks if frontend is reachable",
  callback: async () => {
    console.log("Checking frontend health...");
    const startedAt = new Date().toISOString();
    investigationTimeline.push({
      timestamp: startedAt,
      action: "checkFrontendHealth",
      status: "started",
    });
    try {
      console.log("Checking frontend health...");

      const result = await checkFrontendHealth();

      investigationFindings.push(
        result.healthy
          ? `Frontend health check succeeded (HTTP ${result.statusCode})`
          : `Frontend health check failed${
              result.statusCode ? ` (HTTP ${result.statusCode})` : ""
            }`,
      );

      investigationTimeline.push({
        timestamp: new Date().toISOString(),
        action: "checkFrontendHealth",
        status: "COMPLETED",
        result,
      });

      return result;
    } catch (error) {
      investigationTimeline.push({
        timestamp: new Date().toISOString(),
        action: "checkFrontendHealth",
        status: "FAILED",
        error: error.message,
      });

      throw error;
    }
  },
});
const checkElasticBeanstalkHealthTool = tool({
  name: "checkElasticBeanstalkHealth",
  description: "Checks the health of Elastic Beanstalk environments",
  callback: async () => {
    console.log("Checking Elastic Beanstalk health...");
    const startedAt = new Date().toISOString();
    investigationTimeline.push({
      timestamp: startedAt,
      action: "checkElasticBeanstalkHealth",
      status: "started",
    });
    try {
      const result = await checkElasticBeanstalkHealth();

      const devEnv = result.find(
        (env) => env.environmentName === process.env.EB_ENV_NAME,
      );

      if (devEnv) {
        investigationFindings.push(
          `Dev Elastic Beanstalk environment health is ${devEnv.health} (${devEnv.healthStatus})`,
        );
      }

      investigationTimeline.push({
        timestamp: new Date().toISOString(),
        action: "checkElasticBeanstalkHealth",
        status: "COMPLETED",
        result,
      });
      return result;
    } catch (error) {
      investigationTimeline.push({
        timestamp: new Date().toISOString(),
        action: "checkElasticBeanstalkHealth",
        status: "FAILED",
        error: error.message,
      });
      throw error;
    }
  },
});
const restartElasticBeanstalkEnvironmentTool = tool({
  name: "restartElasticBeanstalkEnvironment",
  description: "Restarts Elastic Beanstalk environment app servers",
  callback: async () => {
    console.log("Restarting Elastic Beanstalk environment...");
    const startedAt = new Date().toISOString();
    investigationTimeline.push({
      timestamp: startedAt,
      action: "restartElasticBeanstalkEnvironment",
      status: "started",
    });
    try {
      const environments = await checkElasticBeanstalkHealth();
      const targetEnv = environments.find(
        (env) => env.environmentName === process.env.EB_ENV_NAME,
      );
      const isRestartAllowed = canRestartEnvironment({
        backendHealth: targetEnv.health,
        backendHealthStatus: targetEnv.healthStatus,
      });
      console.log("Restart allowed?", isRestartAllowed);

      if (!isRestartAllowed.allowed) {
        investigationTimeline.push({
          timestamp: new Date().toISOString(),
          action: "restartElasticBeanstalkEnvironment",
          status: "BLOCKED",
          reason: isRestartAllowed.reason,
        });

        return {
          success: false,
          blocked: true,
          reason: isRestartAllowed.reason,
        };
      }

      const result = await restartElasticBeanstalkEnvironment();
      investigationFindings.push(
        "Elastic Beanstalk environment restart was successfully initiated and completed",
      );

      investigationTimeline.push({
        timestamp: new Date().toISOString(),
        action: "restartElasticBeanstalkEnvironment",
        status: "COMPLETED",
        result,
      });
      return result;
    } catch (error) {
      investigationTimeline.push({
        timestamp: new Date().toISOString(),
        action: "restartElasticBeanstalkEnvironment",
        status: "FAILED",
        error: error.message,
      });
      throw error;
    }
  },
});

const checkLambdaLogsTool = tool({
  name: "checkLambdaLogs",
  description: "Checks recent CloudWatch logs for Lambda functions",
  callback: async () => {
    console.log("Checking Lambda logs...");

    const startedAt = new Date().toISOString();

    investigationTimeline.push({
      timestamp: startedAt,
      action: "checkLambdaLogs",
      status: "started",
    });

    try {
      const result = await checkLambdaLogs();

      if (result?.length) {
        investigationFindings.push(
          `Lambda log inspection found ${result.length} recent log events`,
        );
      } else {
        investigationFindings.push(
          "Lambda log inspection found no recent errors or events",
        );
      }

      investigationTimeline.push({
        timestamp: new Date().toISOString(),
        action: "checkLambdaLogs",
        status: "COMPLETED",
        result,
      });

      return result;
    } catch (error) {
      investigationTimeline.push({
        timestamp: new Date().toISOString(),
        action: "checkLambdaLogs",
        status: "FAILED",
        error: error.message,
      });

      throw error;
    }
  },
});

const checkElasticBeanstalkLogsTool = tool({
  name: "checkElasticBeanstalkLogs",
  description: "Checks recent Elastic Beanstalk application logs",
  callback: async () => {
    console.log("Checking Elastic Beanstalk logs...");

    const startedAt = new Date().toISOString();

    investigationTimeline.push({
      timestamp: startedAt,
      action: "checkElasticBeanstalkLogs",
      status: "started",
    });

    try {
      const result = await checkElasticBeanstalkLogs();
      console.log("EB LOG RESULT:");
      console.log(JSON.stringify(result, null, 2));

      investigationFindings.push(
        `Elastic Beanstalk log inspection found ${result.length} recent log events`,
      );

      investigationTimeline.push({
        timestamp: new Date().toISOString(),
        action: "checkElasticBeanstalkLogs",
        status: "COMPLETED",
        result,
      });

      return result;
    } catch (error) {
      investigationTimeline.push({
        timestamp: new Date().toISOString(),
        action: "checkElasticBeanstalkLogs",
        status: "FAILED",
        error: error.message,
      });

      throw error;
    }
  },
});

export {
  checkFrontendHealthTool,
  checkElasticBeanstalkHealthTool,
  restartElasticBeanstalkEnvironmentTool,
  checkLambdaLogsTool,
  checkElasticBeanstalkLogsTool,
};
