const {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} = require("@aws-sdk/client-bedrock-agentcore");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION }),
);

const INCIDENT_TABLE = process.env.INCIDENT_TABLE;
const INCIDENT_ID = process.env.INCIDENT_ID;

async function getIncidentState() {
  const result = await dynamo.send(
    new GetCommand({
      TableName: INCIDENT_TABLE,
      Key: {
        id: INCIDENT_ID,
      },
    }),
  );

  return result.Item;
}

async function openIncident() {
  await dynamo.send(
    new PutCommand({
      TableName: INCIDENT_TABLE,
      Item: {
        id: INCIDENT_ID,
        status: "OPEN",
        openedAt: new Date().toISOString(),
      },
    }),
  );
}

async function closeIncident() {
  await dynamo.send(
    new PutCommand({
      TableName: INCIDENT_TABLE,
      Item: {
        id: INCIDENT_ID,
        status: "CLOSED",
        closedAt: new Date().toISOString(),
      },
    }),
  );
}

const client = new BedrockAgentCoreClient({
  region: "eu-west-2",
});

const AGENT_RUNTIME_ARN = process.env.AGENT_RUNTIME_ARN;

async function invokeAgent(message) {
  const command = new InvokeAgentRuntimeCommand({
    agentRuntimeArn: AGENT_RUNTIME_ARN,
    qualifier: "DEFAULT",
    contentType: "application/json",
    accept: "application/json, text/event-stream",
    payload: Buffer.from(
      JSON.stringify({
        prompt: message,
      }),
    ),
  });

  try {
    const response = await client.send(command);

    return response;
  } catch (error) {
    console.error(JSON.stringify(error, null, 2));
    throw error;
  }
}

const FRONTEND_URL = process.env.FRONTEND_URL;
const BACKEND_URL = process.env.BACKEND_URL;

exports.handler = async () => {
  console.log(`Checking ${FRONTEND_URL}`);
  console.log(`Checking ${BACKEND_URL}`);

  const incident = await getIncidentState();

  let frontendStatusCode = null;
  let frontendHealthy = false;
  let frontendError = null;
  let backendStatusCode = null;
  let backendHealthy = false;
  let backendError = null;

  // Frontend check
  try {
    const response = await fetch(FRONTEND_URL, {
      signal: AbortSignal.timeout(10000),
    });
    frontendStatusCode = response.status;
    frontendHealthy = response.status === 200;
  } catch (error) {
    frontendError = {
      message: error.message,
      cause: error.cause?.message,
    };
  }

  // Backend check
  try {
    const response = await fetch(BACKEND_URL, {
      signal: AbortSignal.timeout(10000),
    });
    backendStatusCode = response.status;
    backendHealthy = response.status === 200;
  } catch (error) {
    backendError = {
      message: error.message,
      cause: error.cause?.message,
    };
  }

  console.log(
    JSON.stringify(
      {
        frontendHealthy,
        frontendStatusCode,
        frontendError,
        backendHealthy,
        backendStatusCode,
        backendError,
      },
      null,
      2,
    ),
  );

  const platformHealthy = frontendHealthy && backendHealthy;

  // Recovery
  if (platformHealthy && incident?.status === "OPEN") {
    console.log("Platform recovered. Closing incident.");
    await closeIncident();

    return {
      statusCode: 200,
      body: "Recovered",
    };
  }

  // Healthy
  if (platformHealthy) {
    return {
      statusCode: 200,
      body: "Healthy",
    };
  }

  // Incident already open
  if (incident?.status === "OPEN") {
    console.log("Incident already open. Skipping agent invocation.");

    return {
      statusCode: 500,
      body: "Incident already open",
    };
  }

  // New incident
  console.error("INCIDENT DETECTED");

  await invokeAgent(`
Monitoring system detected a potential incident, please investigate.
Monitoring results:

${JSON.stringify(
  {
    frontendHealthy,
    frontendStatusCode,
    frontendError,
    backendHealthy,
    backendStatusCode,
    backendError,
  },
  null,
  2,
)}
`);

  await openIncident();

  return {
    statusCode: 500,
    body: "Incident opened",
  };
};
