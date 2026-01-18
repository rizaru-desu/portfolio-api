import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  NotFoundException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Custom 404 Exception Filter
 * Implements content negotiation to serve:
 * - Interactive HTML page for browsers
 * - JSON response for API clients
 */
@Catch(NotFoundException)
export class NotFoundFilter implements ExceptionFilter {
  private htmlTemplate: string;

  constructor() {
    // Load HTML template once on initialization
    const templatePath = path.join(
      __dirname,
      '..',
      'templates',
      'not-found.html',
    );
    try {
      this.htmlTemplate = fs.readFileSync(templatePath, 'utf-8');
    } catch (error) {
      console.error('Failed to load 404 HTML template:', error);
      this.htmlTemplate = this.getFallbackHtml();
    }
  }

  catch(exception: NotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode = HttpStatus.NOT_FOUND;
    const timestamp = new Date().toISOString();
    const path = this.sanitizePath(request.url);

    // Content negotiation based on Accept header
    const acceptHeader = request.headers.accept || '';
    const prefersHtml = acceptHeader.includes('text/html');

    if (prefersHtml) {
      // Browser request - serve interactive HTML
      const html = this.htmlTemplate
        .replace('{{PATH}}', this.escapeHtml(path))
        .replace('{{TIMESTAMP}}', timestamp);

      response.status(statusCode).type('text/html').send(html);
    } else {
      // API client request - serve JSON
      const errorResponse = {
        statusCode,
        error: 'Not Found',
        message: 'The requested resource was not found',
        path,
        timestamp,
      };

      response.status(statusCode).json(errorResponse);
    }
  }

  /**
   * Sanitize path to prevent sensitive information leakage
   */
  private sanitizePath(url: string): string {
    // Remove query parameters that might contain sensitive data
    const sanitized = url.split('?')[0];
    // Limit length to prevent log injection
    return sanitized.length > 200
      ? sanitized.substring(0, 200) + '...'
      : sanitized;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }

  /**
   * Fallback HTML if template file cannot be loaded
   */
  private getFallbackHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 - Not Found</title>
  <style>
    body { font-family: monospace; background: #000; color: #0f0; padding: 20px; text-align: center; }
    h1 { font-size: 48px; }
  </style>
</head>
<body>
  <h1>404 - Not Found</h1>
  <p>Path: {{PATH}}</p>
  <p>Timestamp: {{TIMESTAMP}}</p>
  <a href="/" style="color: #0f0;">Go Home</a>
</body>
</html>`;
  }
}
