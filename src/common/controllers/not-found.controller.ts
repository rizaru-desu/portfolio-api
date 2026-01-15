import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

@Controller()
export class NotFoundController {
  /**
   * Global fallback route handler for 404 Not Found errors.
   * This catches all unmatched routes and provides appropriate responses
   * based on the client type (browser vs API client).
   *
   * Must be registered LAST in the controllers array in AppModule.
   */
  @All('*')
  notFound(@Req() req: Request, @Res() res: Response) {
    const acceptsHtml = this.clientAcceptsHtml(req);
    const path = req.path;
    const timestamp = new Date().toISOString();

    if (acceptsHtml) {
      // Browser client - serve terminal-themed HTML page
      return res
        .status(404)
        .header('Content-Type', 'text/html')
        .send(this.generateHtmlResponse(path, timestamp));
    } else {
      // API client - serve structured JSON response
      return res.status(404).json({
        statusCode: 404,
        error: 'Not Found',
        message: 'Route not found',
        path: path,
        timestamp: timestamp,
      });
    }
  }

  /**
   * Detects if the client prefers HTML responses by checking the Accept header.
   */
  private clientAcceptsHtml(req: Request): boolean {
    const acceptHeader = req.headers.accept || '';
    return acceptHeader.includes('text/html');
  }

  /**
   * Generates a terminal-themed HTML page for 404 errors.
   */
  private generateHtmlResponse(path: string, timestamp: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 - Not Found</title>
  <style>
    /* Reset & Base */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace;
      background: #0a0a0a;
      color: #00ff00;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      position: relative;
      overflow: hidden;
    }

    /* Scan-line overlay effect */
    body::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: repeating-linear-gradient(
        0deg,
        rgba(0, 255, 0, 0.03),
        rgba(0, 255, 0, 0.03) 1px,
        transparent 1px,
        transparent 2px
      );
      pointer-events: none;
      z-index: 1;
    }

    /* CRT screen flicker */
    body::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(18, 16, 16, 0.1);
      opacity: 0;
      pointer-events: none;
      animation: flicker 0.15s infinite;
      z-index: 2;
    }

    @keyframes flicker {
      0% { opacity: 0.27861; }
      5% { opacity: 0.34769; }
      10% { opacity: 0.23604; }
      15% { opacity: 0.90626; }
      20% { opacity: 0.18128; }
      25% { opacity: 0.83891; }
      30% { opacity: 0.65583; }
      35% { opacity: 0.67807; }
      40% { opacity: 0.26559; }
      45% { opacity: 0.84693; }
      50% { opacity: 0.96019; }
      55% { opacity: 0.08594; }
      60% { opacity: 0.20313; }
      65% { opacity: 0.71988; }
      70% { opacity: 0.53455; }
      75% { opacity: 0.37288; }
      80% { opacity: 0.71428; }
      85% { opacity: 0.70419; }
      90% { opacity: 0.7003; }
      95% { opacity: 0.36108; }
      100% { opacity: 0.24387; }
    }

    /* Terminal Container */
    .terminal {
      position: relative;
      z-index: 3;
      max-width: 800px;
      width: 100%;
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid #00ff00;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 
        0 0 20px rgba(0, 255, 0, 0.5),
        inset 0 0 50px rgba(0, 255, 0, 0.05);
      animation: terminalGlow 2s ease-in-out infinite alternate;
    }

    @keyframes terminalGlow {
      from {
        box-shadow: 
          0 0 20px rgba(0, 255, 0, 0.5),
          inset 0 0 50px rgba(0, 255, 0, 0.05);
      }
      to {
        box-shadow: 
          0 0 30px rgba(0, 255, 0, 0.7),
          inset 0 0 60px rgba(0, 255, 0, 0.08);
      }
    }

    /* ASCII Art Header */
    .ascii-art {
      font-size: 14px;
      line-height: 1.2;
      text-align: center;
      margin-bottom: 30px;
      color: #00ff00;
      text-shadow: 0 0 10px rgba(0, 255, 0, 0.8);
      white-space: pre;
      overflow-x: auto;
    }

    /* Content Sections */
    .error-code {
      font-size: 48px;
      text-align: center;
      margin-bottom: 20px;
      font-weight: bold;
      text-shadow: 0 0 20px rgba(0, 255, 0, 1);
      letter-spacing: 4px;
    }

    .error-message {
      font-size: 20px;
      text-align: center;
      margin-bottom: 30px;
      color: #33ff33;
    }

    .details {
      background: rgba(0, 255, 0, 0.05);
      border: 1px solid #00ff00;
      border-radius: 4px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .details-line {
      margin: 10px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .label {
      color: #00cc00;
      font-weight: bold;
    }

    .value {
      color: #00ff00;
      word-break: break-all;
    }

    /* Blinking Cursor */
    .cursor {
      display: inline-block;
      width: 10px;
      height: 20px;
      background: #00ff00;
      animation: blink 1s step-end infinite;
      margin-left: 5px;
    }

    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }

    /* Command Prompt */
    .prompt {
      margin-top: 30px;
      font-size: 16px;
    }

    .prompt-symbol {
      color: #00ff00;
      margin-right: 5px;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .terminal {
        padding: 20px;
      }

      .ascii-art {
        font-size: 10px;
      }

      .error-code {
        font-size: 36px;
      }

      .error-message {
        font-size: 16px;
      }

      .details-line {
        flex-direction: column;
        gap: 5px;
      }
    }

    @media (max-width: 480px) {
      body {
        padding: 10px;
      }

      .ascii-art {
        font-size: 8px;
      }

      .error-code {
        font-size: 28px;
        letter-spacing: 2px;
      }

      .error-message {
        font-size: 14px;
      }
    }
  </style>
</head>
<body>
  <div class="terminal">
    <div class="ascii-art">
 _____ _____ _____    
|  |  |  |  |  |  |   
|__  _|  |  |__  _|   
   |_| |_____|   |_|   
                       
 _   _       _     _____                    _ 
| \\ | | ___ | |_  |  ___|__  _   _ _ __   __| |
|  \\| |/ _ \\| __| | |_ / _ \\| | | | '_ \\ / _\` |
| |\\  | (_) | |_  |  _| (_) | |_| | | | | (_| |
|_| \\_|\\___/ \\__| |_|  \\___/ \\__,_|_| |_|\\__,_|
    </div>

    <div class="error-code">ERROR 404</div>
    <div class="error-message">ROUTE NOT FOUND</div>

    <div class="details">
      <div class="details-line">
        <span class="label">[PATH]:</span>
        <span class="value">${this.escapeHtml(path)}</span>
      </div>
      <div class="details-line">
        <span class="label">[TIMESTAMP]:</span>
        <span class="value">${timestamp}</span>
      </div>
      <div class="details-line">
        <span class="label">[STATUS]:</span>
        <span class="value">404 Not Found</span>
      </div>
      <div class="details-line">
        <span class="label">[MESSAGE]:</span>
        <span class="value">The requested resource does not exist on this server</span>
      </div>
    </div>

    <div class="prompt">
      <span class="prompt-symbol">$</span>
      <span>Redirect to homepage?</span>
      <span class="cursor"></span>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Escapes HTML special characters to prevent XSS attacks.
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
}
