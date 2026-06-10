# Recursica Knowledge Setup Guide

This guide explains how to install and configure **Recursica Knowledge** in your development environment.

---

## 📦 Option 1: Install via NPM (Workspace Package)

You can install the knowledge package directly into your project's `devDependencies`.

### 1. Install the Package

Run the following command in your project root:

```bash
npm install --save-dev @recursica/knowledge
```

### 2. Initialize the Knowledge Symlinks

Once installed, run the setup script to link the packaged knowledge assets and skills into your project's `.agent/skills/` directory:

```bash
npx recursica-knowledge init
```

This symlinks the skills from `node_modules/@recursica/knowledge/` into your local workspace so that your AI assistant can discover them.

---

## 🔌 Option 2: Install via Claude Code Plugin Marketplace (CLI Plugin)

If you are using **Claude Code**, you can register this repository as a plugin marketplace and install the knowledge plugin globally or locally.

### 1. Add the Marketplace

Add the registry using the repository owner and name:

```bash
/plugin marketplace add recursica/recursica-knowledge
```

### 2. Install the Plugin

Once the marketplace is registered, discover and install the `recursica-knowledge` plugin:

```bash
/plugin install recursica-knowledge@recursica-knowledge
```

Claude Code will automatically load the skills and apply them dynamically on-demand.
