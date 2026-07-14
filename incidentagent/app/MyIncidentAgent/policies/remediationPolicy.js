export function canRestartEnvironment({ backendHealth, backendHealthStatus }) {
  // we want the agent to never restart Elastic Beanstalk if it's healthy
  if (backendHealth !== "Green" || backendHealthStatus !== "Ok") {
    return {
      allowed: true,
      reason: "Elastic Beanstalk environment is not healthy. Restart allowed.",
    };
  }

  return {
    allowed: false,
    reason: "No remediation conditions matched. Restart not allowed",
  };
}
