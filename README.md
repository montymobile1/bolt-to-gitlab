# Bolt to GitLab - Chrome Extension

<div align="center">
  <a href="https://montymobile.com/">
    <img src="assets/icons/icon128.png" width="128">
  </a>
  <h3>A project by <a href="https://montymobile.com/">Monty mobile</a></h3>
</div>

A Chrome extension that automatically captures ZIP file downloads from bolt.new, extracts them, and pushes the contents to a specified **GitLab** repository. Forked and extended from the [Bolt to GitHub](https://github.com/mamertofabian/bolt-to-github) project. Built with Svelte, TypeScript, and TailwindCSS.

## 📦 Installation Options

### Stable Version (Coming Soon to Chrome Web Store)

In the meantime, you can install the extension manually from source (see below).

---

### Latest stable version (v0.0.2) includes the following features:

- Direct **GitLab** repository integration
- Support for Private GitLab repositories
- Token-based authentication
- Enhanced project management interface
- Projects tab with quick access to all your Bolt projects:
  - View all pushed projects
  - Open in Bolt.new
  - View GitLab repositories
  - Import GitLab repos back into Bolt
- Save project settings automatically
- Updated UI components and dashboard
- Modal system for better interactions
- Robust error handling and token validation

#### Existing Features (Inherited from GitHub version)

- 🚀 Automatic ZIP file interception from bolt.new
- 📦 In-browser ZIP file extraction
- 🔒 Secure credential storage using Chrome storage API
- ⚡ Real-time processing status updates
- 🎨 Clean, responsive UI with shadcn-svelte components
- 📱 Modern, accessible interface
- 🔄 Upload progress tracking
- 🎯 Custom upload status alerts
- ✨ Multi-repository support
- 📄 `.gitignore` file respect for uploads
- ⚙️ Repo settings in popup
- ✉️ Custom commit messages

---

## 👉 Installation (For GitLab Users)

Get started in just 3 simple steps:

1. **Clone & Install the Extension Locally**

   ```bash
   git clone https://github.com/montymobile1/bolt-to-gitlab.git
   cd bolt-to-gitlab
   npm install
   npm run build
   ```

2. **Load the Extension in Chrome**

   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist` directory from the project folder

3. **Configure the Extension for GitLab**

   - Load your Bolt.new project in a new tab
   - Click the extension icon in Chrome
   - Enter your **GitLab Personal Access Token** (with `api` and `write_repository` scope)
   - Repository Owner / Group
   - Repository Name
   - Branch Name (default: `main`)
   - Save your settings and you're good to go!

> [Create a GitLab account](https://gitlab.com/users/sign_in) if you don’t have one.
> [Generate a GitLab token](https://gitlab.com/-/user_settings/personal_access_tokens)

---

## 🛠️ For Developers (Contributing)

1. Set up your development environment:

   ```bash
   node --version   # Ensure Node.js v16 or later
   ```

2. Clone & install:

   ```bash
   git clone https://github.com/montymobile1/bolt-to-gitlab.git
   cd bolt-to-gitlab
   npm install
   ```

3. Build for development:

   ```bash
   npm run watch    # For development with hot reload
   # OR
   npm run build    # For production build
   ```

4. Load in Chrome:

   - Go to `chrome://extensions/`
   - Enable Developer Mode
   - Click "Load unpacked"
   - Select the `dist` directory

---

## 🧠 Best Practices

1. Always verify GitLab repo settings before syncing a new project
2. Double-check repository name and branch when switching between projects
3. Use `.gitignore` wisely to skip files you don't want uploaded

---

## Permissions

This extension requires the following Chrome permissions:

- `webRequest` – to intercept downloads
- `downloads` – to manage ZIP files
- `storage` – to store settings and tokens
- `scripting` – to inject logic into bolt.new

---

## FAQ

**Q: Why does the extension need a GitLab token?**  
A: To push files to your repositories securely via the GitLab API.

**Q: Where is my token stored?**  
A: It's stored securely in Chrome using the Storage API.

**Q: Does this extension work with GitHub?**  
A: No, this fork is specifically adapted for GitLab.

**Q: Can I choose which files to upload?**  
A: Not yet, but future versions may support file filtering.

---

## License

MIT License - see [LICENSE](LICENSE) for details

---

## Maintainers & Credits

Forked and adapted by [Hayat Bourji] from the original project by [Mamerto Fabian](https://github.com/mamertofabian)


- [Original Project](https://github.com/mamertofabian/bolt-to-github)
- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Svelte](https://svelte.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/), [TailwindCSS](https://tailwindcss.com/)