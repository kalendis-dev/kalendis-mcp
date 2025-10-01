#!/usr/bin/env node

/**
 * MCP Server for Kalendis API Client Generation
 * Provides tools to generate TypeScript clients with proper x-api-key authentication
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  generateBackendClient,
  generateFrontendClient,
  generateNextjsRoutes,
  generateExpressRoutes,
  generateFastifyRoutes,
  generateNestJSModule,
  Environment,
} from './generators/client.js';
import { ENDPOINTS } from './endpoints.js';

// Initialize MCP server
const server = new Server(
  {
    name: 'kalendis-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Define available tools
const TOOLS: Tool[] = [
  {
    name: 'generate-backend-client',
    description: 'Generate a TypeScript client that calls Kalendis API directly with x-api-key authentication',
    inputSchema: {
      type: 'object',
      properties: {
        environment: {
          type: 'string',
          enum: ['production', 'staging', 'development'],
          description: 'Target environment (optional, defaults to production)',
        },
        typesImportPath: {
          type: 'string',
          description: 'Import path for types file (optional, defaults to "../types")',
        },
      },
      required: [],
    },
  },
  {
    name: 'generate-frontend-client',
    description: 'Generate a TypeScript client for frontend apps that calls your backend API endpoints',
    inputSchema: {
      type: 'object',
      properties: {
        typesImportPath: {
          type: 'string',
          description: 'Import path for types file (optional, defaults to "../types")',
        },
      },
    },
  },
  {
    name: 'generate-api-routes',
    description: 'Generate API route handlers for Next.js or Express that use the Kalendis backend client',
    inputSchema: {
      type: 'object',
      properties: {
        framework: {
          type: 'string',
          enum: ['nextjs', 'express', 'fastify', 'nestjs'],
          description: 'Target framework',
        },
        typesImportPath: {
          type: 'string',
          description: 'Import path for types file (optional, defaults to "@/lib/types" for Next.js)',
        },
      },
      required: ['framework'],
    },
  },
  {
    name: 'list-endpoints',
    description: 'List all available Kalendis API endpoints with descriptions',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'generate-backend-client': {
        // Default to production if not provided
        const environment = args?.environment || 'production';
        if (typeof environment !== 'string' || !['production', 'staging', 'development'].includes(environment)) {
          throw new Error('Valid environment is required (production, staging, development)');
        }

        // Generate the client
        const code = generateBackendClient({
          environment: environment as Environment,
          typesImportPath: args?.typesImportPath as string | undefined,
          framework: 'vanilla', // Not used in backend client
        });

        return {
          content: [
            {
              type: 'text',
              text: code,
            },
          ],
        };
      }

      case 'generate-frontend-client': {
        // Generate the frontend client
        const code = generateFrontendClient({
          typesImportPath: args?.typesImportPath as string | undefined,
        });

        return {
          content: [
            {
              type: 'text',
              text: code,
            },
          ],
        };
      }

      case 'generate-api-routes': {
        // Validate framework
        if (
          !args?.framework ||
          typeof args.framework !== 'string' ||
          !['nextjs', 'express', 'fastify', 'nestjs'].includes(args.framework)
        ) {
          throw new Error('Valid framework is required (nextjs, express, fastify, or nestjs)');
        }

        let code: string;
        if (args.framework === 'nextjs') {
          // Generate Next.js routes
          const routes = generateNextjsRoutes(args.typesImportPath as string | undefined);
          // Combine all route files into a single response
          code = Object.entries(routes)
            .map(([path, content]) => `// File: ${path}\n${content}`)
            .join('\n\n// ========================================\n\n');
        } else if (args.framework === 'express') {
          // Generate Express routes
          code = generateExpressRoutes();
        } else if (args.framework === 'fastify') {
          // Generate Fastify routes
          code = generateFastifyRoutes();
        } else if (args.framework === 'nestjs') {
          // Generate NestJS module files
          const files = generateNestJSModule(args.typesImportPath as string | undefined);
          // Combine all NestJS files into a single response
          code = Object.entries(files)
            .map(([path, content]) => `// File: ${path}\n${content}`)
            .join('\n\n// ========================================\n\n');
        } else {
          throw new Error(`Unsupported framework: ${args.framework}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: code,
            },
          ],
        };
      }

      case 'list-endpoints': {
        // Format endpoints list
        const endpointsList = Object.entries(ENDPOINTS)
          .map(([name, endpoint]) => {
            const params = endpoint.params ? '\n    Query params: ' + Object.keys(endpoint.params).join(', ') : '';
            const body = endpoint.body ? '\n    Body params: ' + Object.keys(endpoint.body).join(', ') : '';
            const responseInfo = endpoint.response
              ? `\n    Response: ${endpoint.response.type} - ${endpoint.response.description}`
              : '';
            return `${name}:\n  ${endpoint.method} ${endpoint.path}\n  ${endpoint.description}${params}${body}${responseInfo}`;
          })
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Kalendis API Endpoints:\n\n${endpointsList}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        },
      ],
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Kalendis MCP Server running');
}

main().catch(error => {
  console.error('Server error:', error);
  process.exit(1);
});
