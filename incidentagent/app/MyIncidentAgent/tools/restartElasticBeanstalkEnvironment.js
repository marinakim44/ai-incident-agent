import {
  ElasticBeanstalkClient,
  RestartAppServerCommand,
} from "@aws-sdk/client-elastic-beanstalk";
import { checkElasticBeanstalkHealth } from "./checkElasticBeanstalkHealth.js";

const client = new ElasticBeanstalkClient({
  region: "eu-west-2",
});

export async function restartElasticBeanstalkEnvironment() {
  try {
    const command = new RestartAppServerCommand({
      EnvironmentName: process.env.EB_ENV_NAME,
    });

    await client.send(command);

    await new Promise((resolve) => setTimeout(resolve, 2 * 60 * 1000)); // wait 2 minutes for environment to restart

    const health = await checkElasticBeanstalkHealth();

    return {
      success: true,
      message: "Elastic Beanstalk app servers restarted",
      healthAfterRestart: health,
    };
  } catch (err) {
    console.log("Error restarting Elastic Beanstalk", err);
    return {
      success: false,
      error: err.message,
    };
  }
}
