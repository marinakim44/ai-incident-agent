import {
  ElasticBeanstalkClient,
  DescribeEnvironmentsCommand,
} from "@aws-sdk/client-elastic-beanstalk";

const client = new ElasticBeanstalkClient({
  region: "eu-west-2",
});

export async function checkElasticBeanstalkHealth() {
  try {
    const command = new DescribeEnvironmentsCommand({
      ApplicationName: process.env.APPLICATION_NAME,
    });
    const response = await client.send(command);
    return response.Environments.map((env) => ({
      environmentName: env.EnvironmentName,
      status: env.Status,
      health: env.Health,
      healthStatus: env.HealthStatus,
      cname: env.CNAME,
    }));
  } catch (err) {
    console.log("Error checking Elastic Beanstalk health", err);
    return {
      success: false,
      error: err.message,
    };
  }
}
