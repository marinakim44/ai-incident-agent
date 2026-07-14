import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

const logsClient = new CloudWatchLogsClient({
  region: "eu-west-2",
});

const LOG_GROUP = process.env.LOG_GROUP;

export async function checkElasticBeanstalkLogs() {
  console.log("Reading log group:", LOG_GROUP);
  try {
    const response = await logsClient.send(
      new FilterLogEventsCommand({
        logGroupName: LOG_GROUP,
        startTime: Date.now() - 60 * 60 * 1000, // last hour
        limit: 50,
      }),
    );

    return (
      response.events?.map((event) => ({
        timestamp: event.timestamp,
        message: event.message,
      })) || []
    );
  } catch (error) {
    onsole.error("=== EB LOG TOOL FAILED ===");
    console.error(error);
    console.error(JSON.stringify(error, null, 2));

    return {
      success: false,
      error: error?.message,
    };
  }
}
