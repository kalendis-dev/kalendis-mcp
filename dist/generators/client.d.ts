/**
 * Simple client generator for Kalendis API
 * Generates TypeScript clients with correct x-api-key authentication
 */
export declare const BASE_URLS: {
    readonly production: "https://api.kalendis.dev";
    readonly staging: "https://dev-303703761.us-central1.run.app";
    readonly development: string;
};
export type Environment = keyof typeof BASE_URLS;
export type Framework = 'react' | 'nextjs' | 'express' | 'vanilla' | 'fastify' | 'nestjs';
export interface GenerateOptions {
    framework: Framework;
    environment: Environment;
    typesImportPath?: string;
    outputDir?: string;
}
export declare function generateBackendClient(options: GenerateOptions): string;
export declare function generateFrontendClient(options?: {
    typesImportPath?: string;
}): string;
export declare function generateNextjsRoutes(typesPath?: string): Record<string, string>;
export declare function writeFile(filePath: string, content: string): Promise<void>;
export declare function generateExpressRoutes(): string;
export declare function generateFastifyRoutes(): string;
export declare function generateNestJSModule(typesPath?: string): Record<string, string>;
//# sourceMappingURL=client.d.ts.map