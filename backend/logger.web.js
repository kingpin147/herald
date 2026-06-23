import { Permissions, webMethod } from "wix-web-module";
import wixData from "wix-data";

export const logError = webMethod(
  Permissions.Anyone,
  async (source, error, userId = null) => {
    return await saveLog("error", source, error.message || String(error), userId, error);
  }
);

export const logWarning = webMethod(
  Permissions.Anyone,
  async (source, message, userId = null, details = null) => {
    return await saveLog("warn", source, message, userId, details);
  }
);

export const logInfo = webMethod(
  Permissions.Anyone,
  async (source, message, userId = null, details = null) => {
    return await saveLog("info", source, message, userId, details);
  }
);

async function saveLog(level, source, message, userId, details) {
  try {
    // Attempt stringification for arbitrary error/details objects
    let strDetails = "";
    if (details) {
      if (details instanceof Error) {
        strDetails = JSON.stringify(details, Object.getOwnPropertyNames(details));
      } else if (typeof details === "object") {
        strDetails = JSON.stringify(details);
      } else {
        strDetails = String(details);
      }
    }

    const toInsert = {
      title: `${level.toUpperCase()} - ${source}`,
      message,
      level,
      source,
      details: strDetails,
      userId
    };
    return await wixData.insert("logs", toInsert, { suppressAuth: true });
  } catch (err) {
    console.error("Failed to write to logs collection:", err);
  }
}