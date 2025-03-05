export const HTML_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <title>Telegram API Middleware</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    h1, h2 {
      color: #0088cc;
      text-align: center;
    }
    .container {
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
    }
    .info { margin: 20px 0; }
    .note {
      background-color: #e9ecef;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
    }
    code {
      background-color: #f1f3f5;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
    .code-form {
      background-color: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .code-form input[type="text"] {
      padding: 10px;
      width: 150px;
      font-size: 18px;
      text-align: center;
      margin: 10px 0;
      border: 2px solid #0088cc;
      border-radius: 4px;
    }
    .code-form button {
      background-color: #0088cc;
      color: white;
      border: none;
      padding: 10px 25px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      transition: background-color 0.2s;
    }
    .code-form button:hover {
      background-color: #006699;
    }
    .status-message {
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
      font-weight: bold;
    }
    .status-message.pending {
      background-color: #fff3cd;
      color: #856404;
    }
    .status-message.error {
      background-color: #f8d7da;
      color: #721c24;
    }
    .status-message.success {
      background-color: #d4edda;
      color: #155724;
    }
  </style>
</head>
<body>
  <h1>Telegram API Middleware</h1>
  
  <div class="container">
    <div class="info">
      <h2>Authentication Status</h2>
      {{STATUS_MESSAGE}}
      
      {{CODE_FORM}}
    </div>

    <div class="note">
      <h3>API Documentation</h3>
      <p>Once authenticated, you can use the following endpoints:</p>
      <ul>
        <li>Get Chats: <code>GET /api/telegram/chats</code></li>
        <li>Get Messages: <code>GET /api/telegram/messages?chatId=123</code></li>
      </ul>
    </div>
  </div>
</body>
</html>
`;

export function generateStatusMessage(error?: string, success?: string, maskedPhone?: string): string {
  if (error) {
    return `<div class="status-message error">${error}</div>`;
  }
  if (success) {
    return `<div class="status-message success">${success}</div>`;
  }
  return `<div class="status-message pending">
    Verification code has been sent to your Telegram account (${maskedPhone})
  </div>`;
}

export function generateCodeForm(showForm: boolean): string {
  if (!showForm) return '';
  return `
    <div class="code-form">
      <h3>Enter Verification Code</h3>
      <form action="/auth/telegram/verify" method="post">
        <input type="text" name="code" placeholder="Enter code" pattern="[0-9]*" maxlength="5" required>
        <br>
        <button type="submit">Submit Code</button>
      </form>
    </div>
  `;
}

export function generateHtml(statusMessage: string, codeForm: string): string {
  return HTML_TEMPLATE
    .replace('{{STATUS_MESSAGE}}', statusMessage)
    .replace('{{CODE_FORM}}', codeForm);
} 