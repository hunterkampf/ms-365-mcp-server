import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import logger, { enableConsoleLogging } from './logger.js';
import { registerAuthTools } from './auth-tools.js';
import { registerGraphTools } from './graph-tools.js';
import GraphClient from './graph-client.js';
import AuthManager from './auth.js';
import type { CommandOptions } from './cli.ts';

class MicrosoftGraphServer {
  private authManager: AuthManager;
  private options: CommandOptions;
  private graphClient: GraphClient;
  private server: McpServer | null;

  constructor(authManager: AuthManager, options: CommandOptions = {}) {
    this.authManager = authManager;
    this.options = options;
    this.graphClient = new GraphClient(authManager);
    this.server = null;
  }

  async initialize(version: string): Promise<void> {
    this.server = new McpServer({
      name: 'Microsoft365MCP',
      version,
    });

    registerAuthTools(this.server, this.authManager);
    registerGraphTools(this.server, this.graphClient, this.options.readOnly);
  }

  async start(): Promise<void> {
  if (this.options.v) {
    enableConsoleLogging();
  }

  logger.info('Microsoft 365 MCP Server starting...');
  if (this.options.readOnly) {
    logger.info('Server running in READ-ONLY mode. Write operations are disabled.');
  }

  // Add HTTP server for Render compatibility
  if (process.env.PORT) {
    const http = await import('http');
    const server = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', service: 'Microsoft 365 MCP Server' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Microsoft 365 MCP Server is running. This is a Model Context Protocol server.');
      }
    });
    
    server.listen(process.env.PORT, () => {
      logger.info(`HTTP server listening on port ${process.env.PORT}`);
    });
  }

  const transport = new StdioServerTransport();
  await this.server!.connect(transport);
  logger.info('Server connected to transport');
}


export default MicrosoftGraphServer;
