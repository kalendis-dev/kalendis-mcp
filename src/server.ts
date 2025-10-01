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

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'generate-backend-client': {
        const environment = args?.environment || 'production';
        if (typeof environment !== 'string' || !['production', 'staging', 'development'].includes(environment)) {
          throw new Error('Valid environment is required (production, staging, development)');
        }

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
        if (
          !args?.framework ||
          typeof args.framework !== 'string' ||
          !['nextjs', 'express', 'fastify', 'nestjs'].includes(args.framework)
        ) {
          throw new Error('Valid framework is required (nextjs, express, fastify, or nestjs)');
        }

        let code: string;
        if (args.framework === 'nextjs') {
          const routes = generateNextjsRoutes(args.typesImportPath as string | undefined);
          code = Object.entries(routes)
            .map(([path, content]) => `// File: ${path}\n${content}`)
            .join('\n\n// ========================================\n\n');
        } else if (args.framework === 'express') {
          code = generateExpressRoutes();
        } else if (args.framework === 'fastify') {
          code = generateFastifyRoutes();
        } else if (args.framework === 'nestjs') {
          const files = generateNestJSModule(args.typesImportPath as string | undefined);
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Kalendis MCP Server running');
}

main().catch(error => {
  console.error('Server error:', error);
  process.exit(1);
});
