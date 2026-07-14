import axios from "axios";

export async function checkFrontendHealth() {
  try {
    const start = Date.now();

    const response = await axios.get(process.env.FRONTEND_URL, {
      timeout: 5000,
    });

    return {
      success: true,
      status: response.status,
      responseTime: Date.now() - start,
    };
  } catch (err) {
    console.log("Error checking Frontend health", err);
    return {
      success: false,
      error: err.message,
    };
  }
}
