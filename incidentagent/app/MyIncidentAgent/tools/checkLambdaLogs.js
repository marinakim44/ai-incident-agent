import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

const logsClient = new CloudWatchLogsClient({
  region: "eu-west-2",
});

// list of your Lambda functions
const FUNCTIONS = [];

export async function checkLambdaLogs() {
  const results = [];

  for (const functionName of FUNCTIONS) {
    try {
      const response = await logsClient.send(
        new FilterLogEventsCommand({
          logGroupName: `/aws/lambda/${functionName}`,
          startTime: Date.now() - 24 * 60 * 60 * 1000, // last 24 hours
          limit: 20, // only last 20 lines of logs
        }),
      );

      const events =
        response.events
          ?.filter(
            (event) =>
              !event.message.includes("INIT_START") &&
              !event.message.includes("START RequestId") &&
              !event.message.includes("END RequestId") &&
              !event.message.includes("REPORT RequestId"),
          )
          .map((event) => ({
            timestamp: event.timestamp,
            message: event.message,
          })) || [];

      results.push({
        functionName,
        events,
      });
    } catch (error) {
      console.error(`checkLambdaLogs failed for ${functionName}:`, error);
      results.push({
        functionName,
        error: error.message,
      });
    }
  }

  return results;
}
