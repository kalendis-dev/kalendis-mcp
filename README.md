# Kalendis MCP Tool

[![npm version](https://badge.fury.io/js/@kalendis%2Fmcp.svg)](https://www.npmjs.com/package/@kalendis/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MCP (Model Context Protocol) server and client generator for Kalendis scheduling API integration.

## Features

- 🔧 **MCP Server**: Exposes Kalendis API tools for use with Claude, Cursor, etc
- 🚀 **Client Generator**: Generates TypeScript clients for backend and frontend applications
- 🛣️ **Route Generator**: Creates API route handlers for Next.js, Fastify, NestJS and Express
- 🔐 **Secure**: Uses environment variables for API key management
- 📝 **Type-safe**: Full TypeScript support with generated types

## Installation

```bash
npm install @kalendis/mcp
```

## Quick Start

### 1. Get Your API Key

Before using the Kalendis MCP tool, you'll need an API key. [Create a free account at kalendis.dev](https://kalendis.dev) to get started. Your API key will be available in your account dashboard and is required for authenticating requests to the Kalendis scheduling API.

### 2. Configure MCP Server

#### Quick Install (Cursor IDE)

Click the button below to automatically add Kalendis to your Cursor IDE:

[<img src="https://cursor.com/deeplink/mcp-install-dark.png" alt="Add to Cursor" height="40">](cursor://anysphere.cursor-deeplink/mcp/install?name=kalendis&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBrYWxlbmRpcy9tY3AiXX0=)

#### Manual Configuration

Alternatively, add this to your MCP settings:

```json
{
  "mcpServers": {
    "kalendis": {
      "command": "npx",
      "args": ["-y", "@kalendis/mcp"]
    }
  }
}
```

### 3. Available MCP Tools

Once configured, the AI agent can use these tools:

- **generate-backend-client**: Generate a TypeScript client for direct API calls
- **generate-frontend-client**: Generate a TypeScript client for frontend applications
- **generate-api-routes**: Generate API route handlers for Next.js, Express, Fastify, or NestJS
- **list-endpoints**: List all available Kalendis API endpoints

## Client Generation

### Backend Client

Generate a client that calls the Kalendis API directly:

```typescript
// Generated client usage
import KalendisClient from './generated/kalendis-client';

// Initialize with your API key (from environment variable, config, etc.)
const client = new KalendisClient({
  apiKey: process.env.MY_API_KEY, // You choose the env var name
});

const users = await client.getUsers();
const user = await client.createUser({ name: 'John Doe', email: 'john@example.com' });
```

### Frontend Client

Generate a client that calls your backend API endpoints:

```typescript
// Generated frontend client usage
import api from './generated/frontend-client';

// Calls your backend endpoints (e.g., /api/users)
const users = await api.getUsers();
```

### API Routes

#### Next.js Routes

Generates App Router API routes:

```typescript
// app/api/users/route.ts
export async function GET(request: Request) {
  // Implementation using backend client
}
```

#### Express Routes

Generates Express router handlers:

```typescript
// routes/api.ts
router.get('/users', async (req, res) => {
  // Implementation using backend client
});
```

#### Fastify Routes

Generates Fastify plugin with route handlers:

```typescript
// routes/kalendis.ts
export default async function routes(fastify: FastifyInstance) {
  fastify.get('/api/users', async (request, reply) => {
    // Implementation using backend client
    return users;
  });
}
```

#### NestJS Module

Generates complete NestJS module with controller, service, and module files:

```typescript
// kalendis.controller.ts
@Controller('api')
export class KalendisController {
  @Get('users')
  async getUsers() {
    return this.kalendisService.getUsersByAccountId();
  }
}

// kalendis.service.ts - Wraps the backend client
// kalendis.module.ts - Wire everything together
```

## API Endpoints Coverage

The tool supports all 28 Kalendis API endpoints:

### Users

- GET /v1/users - Fetch all users
- POST /v1/users - Create user
- PUT /v1/users/:id - Update user
- DELETE /v1/users/:id - Delete user

### Availability

- GET /v1/availability - Get availability with filters
- GET /v1/availability/all - Get all availability
- GET /v1/availability/calculated - Get calculated availability
- GET /v1/availability/recurring - Get recurring availability
- GET /v1/availability/matching - Get matching availability
- POST /v1/availability - Add availability
- PUT /v1/availability/:id - Update availability
- DELETE /v1/availability/:id - Delete availability

### Recurring Availability

- GET /v1/recurring-availability - Get recurring availability
- POST /v1/recurring-availability - Add recurring availability
- PUT /v1/recurring-availability/:id - Update recurring availability
- DELETE /v1/recurring-availability/:id - Delete recurring availability

### Availability Exceptions

- GET /v1/availability-exceptions - Get exceptions
- POST /v1/availability-exceptions - Add exception
- POST /v1/availability-exceptions/recurring - Add recurring exception
- PUT /v1/availability-exceptions/:id - Update exception
- DELETE /v1/availability-exceptions/:id - Delete exception

### Bookings

- GET /v1/bookings - Get bookings
- GET /v1/bookings/:userId - Get user bookings
- POST /v1/bookings - Create booking
- PUT /v1/bookings/:id - Update booking
- DELETE /v1/bookings/:id - Delete booking

### Account

- GET /v1/account - Get account info
- PUT /v1/account - Update account

## Environment Configuration

The tool supports three environments:

- **development**: `https://sandbox.api.kalendis.dev`
- **production**: `https://api.kalendis.dev`

## Authentication

All API calls to the Kalendis scheduling service require authentication via the `x-api-key` header.

The generated clients require you to provide an API key when instantiating:

```typescript
// You control how to manage your API key
const client = new KalendisClient({
  apiKey: process.env.KALENDIS_API_KEY, // or from config, secrets manager, etc.
});
```

The generated API route handlers use environment variables by default, but you can customize this:

```bash
# Example: Set in your application's environment
export KALENDIS_API_KEY="your-api-key-here"
```

**Note**: The MCP tool itself doesn't need or use the API key - it only generates code. The API key is used by the generated clients in your application.

## Error Handling

The generated clients provide clear error messages:

- **401**: Authentication failed - Invalid or missing API key
- **403**: Permission denied - API key lacks required permissions
- **Network errors**: Clear connection failure messages
- **API errors**: Detailed error messages from the API

## Development

To build the MCP tool locally:

```bash
git clone https://github.com/kalendis-dev/kalendis-mcp.git
cd kalendis-mcp
npm install
npm run build
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues or questions:
- Open an issue on [GitHub](https://github.com/kalendis-dev/kalendis-mcp/issues)
- Email: support@kalendis.dev
