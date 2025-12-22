import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    console.log('Deep Canvas Welcome extension is now active!');

    // Hide default welcome tab and show custom welcome
    vscode.commands.executeCommand('workbench.action.closeAllEditors').then(() => {
        if (vscode.workspace.workspaceFolders === undefined || vscode.workspace.workspaceFolders.length === 0) {
            showCustomWelcome(context);
        }
    });

    // Register commands
    const showWelcomeCommand = vscode.commands.registerCommand('deep-canvas-welcome.showWelcome', () => {
        showCustomWelcome(context);
    });

    const createWorkspaceCommand = vscode.commands.registerCommand('deep-canvas-welcome.createVibeWorkspace', async () => {
        await createVibeWorkspace();
    });

    context.subscriptions.push(showWelcomeCommand, createWorkspaceCommand);

    // Auto-create workspace on startup if no folder is open
    if (vscode.workspace.workspaceFolders === undefined || vscode.workspace.workspaceFolders.length === 0) {
        const config = vscode.workspace.getConfiguration('deepCanvas.welcome');
        if (config.get('showOnStartup', true)) {
            createVibeWorkspace();
        }
    }
}

async function showCustomWelcome(context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel(
        'deepCanvasWelcome',
        'Welcome to Deep Canvas',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    panel.webview.html = getWelcomeContent();

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
        message => {
            switch (message.command) {
                case 'createWorkspace':
                    createVibeWorkspace();
                    panel.dispose();
                    break;
                case 'openFolder':
                    vscode.commands.executeCommand('vscode.openFolder');
                    break;
            }
        },
        undefined,
        context.subscriptions
    );
}

async function createVibeWorkspace() {
    // Create default workspace directory
    const homeDir = require('os').homedir();
    const workspaceDir = path.join(homeDir, 'DeepCanvas', 'VibeWorkspace');
    
    try {
        // Create directory if it doesn't exist
        if (!fs.existsSync(workspaceDir)) {
            fs.mkdirSync(workspaceDir, { recursive: true });
            
            // Create some default files
            const readmePath = path.join(workspaceDir, 'README.md');
            const readmeContent = `# Welcome to Your Vibe Workspace! 🚀

## Getting Started with Deep Canvas AI

This is your personal workspace for development.

### Quick Start:
1. Use the embedded VS Code to work on your projects
2. Create files and folders for your projects
3. Let AI assist you with coding tasks

### Tips:
- Ask Roo to help you build applications
- Use natural language to describe what you want
- Approve or reject AI suggestions as they appear

Happy coding! ✨
`;
            fs.writeFileSync(readmePath, readmeContent);
            
            // Create a sample project structure
            const srcDir = path.join(workspaceDir, 'projects');
            fs.mkdirSync(srcDir, { recursive: true });
            
            const samplePath = path.join(srcDir, 'sample-project.md');
            const sampleContent = `# Sample Project

Start building something amazing here!

Create projects like:
- Web applications
- Scripts and utilities  
- Documentation
- And much more!
`;
            fs.writeFileSync(samplePath, sampleContent);
        }

        // Open the workspace
        const uri = vscode.Uri.file(workspaceDir);
        await vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: false });
        
        vscode.window.showInformationMessage('🎉 Vibe Workspace created and opened! Ready to start coding with AI assistance.');
        
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create workspace: ${error}`);
    }
}

function getWelcomeContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Deep Canvas Welcome</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #e2e8f0;
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            text-align: center;
        }
        .logo {
            font-size: 3em;
            font-weight: bold;
            background: linear-gradient(45deg, #14b8a6, #06b6d4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 20px;
        }
        .subtitle {
            font-size: 1.2em;
            color: #94a3b8;
            margin-bottom: 40px;
        }
        .welcome-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 40px 0;
        }
        .welcome-card {
            background: rgba(30, 41, 59, 0.5);
            border: 1px solid #334155;
            border-radius: 12px;
            padding: 30px;
            cursor: pointer;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        }
        .welcome-card:hover {
            border-color: #14b8a6;
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(20, 184, 166, 0.2);
        }
        .card-icon {
            font-size: 3em;
            margin-bottom: 15px;
        }
        .card-title {
            font-size: 1.3em;
            font-weight: bold;
            color: #14b8a6;
            margin-bottom: 10px;
        }
        .card-description {
            color: #cbd5e1;
            line-height: 1.5;
        }
        .features {
            text-align: left;
            margin: 40px 0;
            background: rgba(30, 41, 59, 0.3);
            border-radius: 12px;
            padding: 30px;
        }
        .features h3 {
            color: #14b8a6;
            font-size: 1.5em;
            margin-bottom: 20px;
            text-align: center;
        }
        .feature-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .feature-item {
            display: flex;
            align-items: start;
            gap: 15px;
            padding: 15px;
            background: rgba(20, 184, 166, 0.1);
            border-radius: 8px;
            border-left: 3px solid #14b8a6;
        }
        .feature-icon {
            font-size: 1.5em;
            color: #14b8a6;
            margin-top: 3px;
        }
        .feature-text h4 {
            color: #e2e8f0;
            margin: 0 0 5px 0;
        }
        .feature-text p {
            color: #cbd5e1;
            margin: 0;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🎨 DEEP CANVAS</div>
        <div class="subtitle">AI-Powered Development Platform</div>
        
        <div class="welcome-grid">
            <div class="welcome-card" onclick="createWorkspace()">
                <div class="card-icon">🚀</div>
                <div class="card-title">Start Vibe Workspace</div>
                <div class="card-description">Create a new workspace</div>
            </div>
            
            <div class="welcome-card" onclick="openFolder()">
                <div class="card-icon">📁</div>
                <div class="card-title">Open Existing Folder</div>
                <div class="card-description">Open an existing project folder to work with AI assistance</div>
            </div>
        </div>

        <div class="features">
            <h3>✨ What You Can Do</h3>
            <div class="feature-list">
                <div class="feature-item">
                    <div class="feature-icon">🤖</div>
                    <div class="feature-text">
                        <h4>AI Code Assistant</h4>
                        <p>Get intelligent code suggestions and automated development help</p>
                    </div>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">💬</div>
                    <div class="feature-text">
                        <h4>Natural Language Coding</h4>
                        <p>Describe what you want in plain English and watch AI build it</p>
                    </div>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">⚡</div>
                    <div class="feature-text">
                        <h4>Instant Workspace Setup</h4>
                        <p>Get started immediately with pre-configured development environment</p>
                    </div>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">🎯</div>
                    <div class="feature-text">
                        <h4>Smart Project Organization</h4>
                        <p>Automatically organized file structure for better productivity</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function createWorkspace() {
            vscode.postMessage({
                command: 'createWorkspace'
            });
        }
        
        function openFolder() {
            vscode.postMessage({
                command: 'openFolder'
            });
        }
    </script>
</body>
</html>`;
}

export function deactivate() {}