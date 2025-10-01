#!/usr/bin/env node
"use strict";
/**
 * MCP Server for Kalendis API Client Generation
 * Provides tools to generate TypeScript clients with proper x-api-key authentication
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const client_js_1 = require("./generators/client.js");
const endpoints_js_1 = require("./endpoints.js");
// Initialize MCP server
const server = new index_js_1.Server({
    name: 'kalendis-mcp',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// Define available tools
const TOOLS = [
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
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
    tools: TOOLS,
}));
// Handle tool execution
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
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
                const code = (0, client_js_1.generateBackendClient)({
                    environment: environment,
                    typesImportPath: args?.typesImportPath,
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
                const code = (0, client_js_1.generateFrontendClient)({
                    typesImportPath: args?.typesImportPath,
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
                if (!args?.framework ||
                    typeof args.framework !== 'string' ||
                    !['nextjs', 'express', 'fastify', 'nestjs'].includes(args.framework)) {
                    throw new Error('Valid framework is required (nextjs, express, fastify, or nestjs)');
                }
                let code;
                if (args.framework === 'nextjs') {
                    // Generate Next.js routes
                    const routes = (0, client_js_1.generateNextjsRoutes)(args.typesImportPath);
                    // Combine all route files into a single response
                    code = Object.entries(routes)
                        .map(([path, content]) => `// File: ${path}\n${content}`)
                        .join('\n\n// ========================================\n\n');
                }
                else if (args.framework === 'express') {
                    // Generate Express routes
                    code = (0, client_js_1.generateExpressRoutes)();
                }
                else if (args.framework === 'fastify') {
                    // Generate Fastify routes
                    code = (0, client_js_1.generateFastifyRoutes)();
                }
                else if (args.framework === 'nestjs') {
                    // Generate NestJS module files
                    const files = (0, client_js_1.generateNestJSModule)(args.typesImportPath);
                    // Combine all NestJS files into a single response
                    code = Object.entries(files)
                        .map(([path, content]) => `// File: ${path}\n${content}`)
                        .join('\n\n// ========================================\n\n');
                }
                else {
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
                const endpointsList = Object.entries(endpoints_js_1.ENDPOINTS)
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
    }
    catch (error) {
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
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error('Kalendis MCP Server running');
}
main().catch(error => {
    console.error('Server error:', error);
    process.exit(1);
});
//# sourceMappingURL=server.js.map