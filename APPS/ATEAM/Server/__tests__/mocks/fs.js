// Mock fs module for testing
// Provides in-memory file system operations for isolated testing

const mockFileSystem = {};

module.exports = {
  mkdir: jest.fn((path, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
    }
    mockFileSystem[path] = { isDirectory: true, files: {} };
    if (callback) setTimeout(() => callback(null), 0);
  }),

  writeFile: jest.fn((path, data, callback) => {
    const dir = path.substring(0, path.lastIndexOf('/'));
    if (!mockFileSystem[dir]) {
      mockFileSystem[dir] = { isDirectory: true, files: {} };
    }
    mockFileSystem[path] = data;
    if (callback) setTimeout(() => callback(null), 0);
  }),

  readFile: jest.fn((path, encoding, callback) => {
    if (typeof encoding === 'function') {
      callback = encoding;
    }
    const data = mockFileSystem[path];
    if (!data) {
      const err = new Error(`ENOENT: no such file or directory, open '${path}'`);
      err.code = 'ENOENT';
      return setTimeout(() => callback(err), 0);
    }
    if (callback) setTimeout(() => callback(null, data), 0);
  }),

  readdir: jest.fn((path, callback) => {
    const files = Object.keys(mockFileSystem)
      .filter((p) => p.startsWith(path))
      .map((p) => p.replace(path + '/', '').split('/')[0])
      .filter((v, i, a) => a.indexOf(v) === i);

    if (callback) setTimeout(() => callback(null, files), 0);
  }),

  // Clear mock filesystem for tests
  __clearMockFileSystem: () => {
    Object.keys(mockFileSystem).forEach((key) => delete mockFileSystem[key]);
  },

  // Get current mock filesystem state (for debugging)
  __getMockFileSystem: () => mockFileSystem
};
