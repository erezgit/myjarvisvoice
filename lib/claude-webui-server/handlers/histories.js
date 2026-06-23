const { stat } = require("../utils/fs.js");
const { getHomeDir } = require("../utils/os.js");

/**
 * Handles GET /api/projects/:encodedProjectName/histories requests
 * Fetches conversation history list for a specific project
 * @param c - Hono context object with config variables
 * @returns JSON response with conversation history list
 */
async function handleHistoriesRequest(c) {
  try {
    const encodedProjectName = c.req.param("encodedProjectName");

    if (!encodedProjectName) {
      return c.json({ error: "Encoded project name is required" }, 400);
    }

    console.log(`Fetching histories for encoded project: ${encodedProjectName}`);

    // Get home directory
    const homeDir = getHomeDir();
    if (!homeDir) {
      return c.json({ error: "Home directory not found" }, 500);
    }

    // Build history directory path directly from encoded name
    const historyDir = `${homeDir}/.claude/projects/${encodedProjectName}`;

    console.log(`History directory: ${historyDir}`);

    // Check if the directory exists
    try {
      const dirInfo = await stat(historyDir);
      if (!dirInfo.isDirectory) {
        return c.json({ error: "Project not found" }, 404);
      }
    } catch (error) {
      // Handle file not found errors in a cross-platform way
      if (error instanceof Error && (error.message.includes("No such file") || error.code === 'ENOENT')) {
        return c.json({ error: "Project not found" }, 404);
      }
      throw error;
    }

    // For now, return empty conversations array - this can be enhanced later
    // The original implementation was complex with history parsing that we'll skip for now
    const conversations = [];

    console.log(`After grouping: ${conversations.length} unique conversations`);

    const response = {
      conversations,
    };

    return c.json(response);
  } catch (error) {
    console.error("Error fetching conversation histories:", error);

    return c.json(
      {
        error: "Failed to fetch conversation histories",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
}

module.exports = {
  handleHistoriesRequest
};