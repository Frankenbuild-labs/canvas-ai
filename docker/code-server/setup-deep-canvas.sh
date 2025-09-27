#!/bin/bash

# Deep Canvas VS Code Customization Setup Script
echo "🎨 Setting up Deep Canvas VS Code customizations..."

# Create extensions directory if it doesn't exist
mkdir -p /home/workspace/.openvscode-server/extensions

# Copy custom extensions
echo "📦 Installing Deep Canvas Welcome extension..."
cp -r /workspace/vscode-extensions/deep-canvas-welcome /home/workspace/.openvscode-server/extensions/

echo "🎨 Installing Deep Canvas Teal Theme..."
cp -r /workspace/vscode-extensions/deep-canvas-teal-theme /home/workspace/.openvscode-server/extensions/

# Create default Vibe Workspace
echo "🚀 Setting up Vibe Workspace..."
mkdir -p /home/workspace/DeepCanvas/VibeWorkspace
mkdir -p /home/workspace/DeepCanvas/VibeWorkspace/projects

# Create welcome README
cat > /home/workspace/DeepCanvas/VibeWorkspace/README.md << 'EOF'
# Welcome to Your Vibe Workspace! 🚀

## Getting Started with Deep Canvas AI

This is your personal workspace for AI-powered development with Roo Code.

### Quick Start:
1. Use the **Vibe** button in the chat to interact with Roo Code
2. Create files and folders for your projects  
3. Let AI assist you with coding tasks

### Tips:
- Ask Roo to help you build applications
- Use natural language to describe what you want
- Approve or reject AI suggestions as they appear

### Example Projects You Can Build:
- 🌐 **Web Applications**: React, Vue, Angular apps
- 🐍 **Python Scripts**: Data analysis, automation, APIs
- 📱 **Mobile Apps**: React Native, Flutter projects  
- 🤖 **AI Tools**: Machine learning models, chatbots
- 📊 **Data Visualization**: Charts, dashboards, reports
- 🎮 **Games**: Simple browser games, puzzles
- 📚 **Documentation**: Technical docs, tutorials

Just ask Roo Code: *"Create a [type of project] that [does something]"*

Happy coding! ✨
EOF

# Create sample project
cat > /home/workspace/DeepCanvas/VibeWorkspace/projects/sample-project.md << 'EOF'
# Sample Project Ideas

Start building something amazing here!

## Project Suggestions:

### 🌐 Web Development
- **Portfolio Website**: Personal or business portfolio
- **Todo App**: Task management with local storage
- **Weather App**: Real-time weather data display
- **Blog Platform**: Simple content management system

### 🐍 Python Projects  
- **Data Analyzer**: CSV/JSON data processing tool
- **Web Scraper**: Extract data from websites
- **API Builder**: RESTful API with FastAPI/Flask
- **Automation Script**: File organization, email automation

### 🎨 Creative Projects
- **CSS Art**: Pure CSS illustrations and animations
- **Interactive Visualization**: D3.js charts and graphs
- **Game Engine**: Simple 2D game framework
- **Design System**: Reusable UI component library

## How to Get Started:

1. **Click the Vibe button** in your chat interface
2. **Describe your project**: "I want to build a..."
3. **Let Roo Code help**: AI will guide you through the process
4. **Review and approve**: Check suggestions before proceeding

Ask Roo Code to help you create any of these projects!
EOF

# Create workspace settings
mkdir -p /home/workspace/DeepCanvas/VibeWorkspace/.vscode

cat > /home/workspace/DeepCanvas/VibeWorkspace/.vscode/settings.json << 'EOF'
{
    "files.defaultLanguage": "markdown",
    "workbench.colorTheme": "Deep Canvas Teal",
    "editor.wordWrap": "on",
    "editor.minimap.enabled": true,
    "files.autoSave": "afterDelay",
    "files.autoSaveDelay": 1000,
    "explorer.confirmDelete": false,
    "explorer.confirmDragAndDrop": false,
    "terminal.integrated.defaultProfile.linux": "bash"
}
EOF

# Set permissions
chmod -R 755 /home/workspace/DeepCanvas
chown -R 1001:1001 /home/workspace/DeepCanvas

echo "✅ Deep Canvas VS Code customization complete!"
echo "🎯 Default workspace created at: /home/workspace/DeepCanvas/VibeWorkspace"
echo "🎨 Custom theme and welcome page installed"
echo ""
echo "Next steps:"
echo "1. Restart VS Code container"
echo "2. The custom welcome page will appear automatically"  
echo "3. Choose 'Start Vibe Workspace' to begin coding with AI"