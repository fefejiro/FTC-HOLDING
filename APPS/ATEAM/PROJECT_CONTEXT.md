# ATEAM

**Purpose**
House AI orchestration and agents used across FTC projects.

**Current architecture**
Directory contains server code and memory assets; appears to be custom Node/JS tooling but no package.json at root.

**Tech stack**
Likely Node.js utilities with various scripts; may include Python or other agents not obvious.

**Folder structure summary**
- `Server/` server code
- `memory/` stores agent memory
- `Assets/` and other support directories

**Database usage**
Unclear; possibly none.

**AI usage**
Central component; orchestrates AI agents, stores memory.

**Environment variables**
List unknown; may include API keys, model endpoints.

**Known issues**
No package.json makes dependency management unclear.

**Next 5 priorities**
1. Establish package management and documentation.
2. Define agent responsibilities.
3. Secure memory and access control.
4. Integrate with other applications.
5. Add tests and CI for agent logic.
