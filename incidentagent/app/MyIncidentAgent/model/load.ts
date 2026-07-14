import { BedrockModel } from "@strands-agents/sdk/models/bedrock";

export function loadModel(): BedrockModel {
  return new BedrockModel({
    modelId: "amazon.nova-pro-v1:0",
    guardrailConfig: {
      guardrailIdentifier: "YOUR_GUARDRAIL_IDENTIFIER",
      guardrailVersion: "1",
    },
  });
}
