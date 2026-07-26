import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  collectUserOwnedUploadPaths,
  commitQuarantinedUploadDeletion,
  deleteUserOwnedUploadFiles,
  quarantineUserOwnedUploadFiles,
  restoreQuarantinedUploadFiles,
} from "../../server/userDataDeletion";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

describe("user-owned upload deletion", () => {
  it("collects only local PeacePad upload URLs", () => {
    expect(
      collectUserOwnedUploadPaths({
        profileImageUrl: "/uploads/profiles/person.png",
        nested: [
          { fileUrl: "https://peacepad.ca/uploads/chat/message.pdf?download=1" },
          { external: "https://example.com/uploads/not-ours.pdf" },
          { ordinary: "notes without a file URL" },
        ],
      }),
    ).toEqual([
      "/uploads/chat/message.pdf",
      "/uploads/profiles/person.png",
    ]);
  });

  it("deletes resolved files but refuses traversal outside the upload root", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "peacepad-delete-"));
    temporaryRoots.push(root);
    await fs.mkdir(path.join(root, "chat"), { recursive: true });
    await fs.writeFile(path.join(root, "chat", "message.txt"), "synthetic");

    const result = await deleteUserOwnedUploadFiles(
      ["/uploads/chat/message.txt", "/uploads/../outside.txt"],
      root,
    );

    expect(result).toEqual({ deleted: 1, skipped: 1 });
    await expect(fs.stat(path.join(root, "chat", "message.txt"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("refuses encoded traversal and lookalike PeacePad hosts", () => {
    expect(
      collectUserOwnedUploadPaths({
        encodedTraversal: "/uploads/%2e%2e/outside.txt",
        evilHost: "https://peacepad.ca.example.com/uploads/chat/private.txt",
        trustedApiHost: "https://api.peacepad.ca/uploads/chat/synthetic.txt",
      }),
    ).toEqual([
      "/uploads/../outside.txt",
      "/uploads/chat/synthetic.txt",
    ]);
  });

  it("does not follow a directory symlink or junction outside the upload root", async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "peacepad-symlink-delete-"));
    temporaryRoots.push(base);
    const uploadsRoot = path.join(base, "uploads");
    const outsideRoot = path.join(base, "outside");
    await fs.mkdir(uploadsRoot, { recursive: true });
    await fs.mkdir(outsideRoot, { recursive: true });
    await fs.writeFile(path.join(outsideRoot, "private.txt"), "must survive");
    await fs.symlink(
      outsideRoot,
      path.join(uploadsRoot, "escape"),
      process.platform === "win32" ? "junction" : "dir",
    );

    const result = await deleteUserOwnedUploadFiles(
      ["/uploads/escape/private.txt"],
      uploadsRoot,
    );

    expect(result).toEqual({ deleted: 0, skipped: 1 });
    await expect(fs.readFile(path.join(outsideRoot, "private.txt"), "utf8")).resolves.toBe(
      "must survive",
    );
  });

  it("quarantines an owned file and can restore it after a database failure", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "peacepad-quarantine-"));
    temporaryRoots.push(root);
    const original = path.join(root, "chat", "synthetic.txt");
    await fs.mkdir(path.dirname(original), { recursive: true });
    await fs.writeFile(original, "synthetic");

    const batch = await quarantineUserOwnedUploadFiles(
      ["/uploads/chat/synthetic.txt"],
      root,
    );

    expect(batch.entries).toHaveLength(1);
    await expect(fs.stat(original)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(fs.readFile(batch.entries[0].quarantinePath, "utf8")).resolves.toBe(
      "synthetic",
    );

    await restoreQuarantinedUploadFiles(batch);
    await expect(fs.readFile(original, "utf8")).resolves.toBe("synthetic");
  });

  it("commits quarantine deletion only after the database deletion succeeds", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "peacepad-quarantine-commit-"));
    temporaryRoots.push(root);
    const original = path.join(root, "profiles", "synthetic.png");
    await fs.mkdir(path.dirname(original), { recursive: true });
    await fs.writeFile(original, "synthetic");

    const batch = await quarantineUserOwnedUploadFiles(
      ["/uploads/profiles/synthetic.png"],
      root,
    );
    const quarantineRoot = batch.quarantineRoot;
    expect(quarantineRoot).toBeTruthy();

    await expect(commitQuarantinedUploadDeletion(batch)).resolves.toBe(1);
    await expect(fs.stat(original)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(fs.stat(quarantineRoot!)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("fails closed before moving any file when one reference is unsafe", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "peacepad-quarantine-unsafe-"));
    temporaryRoots.push(root);
    const original = path.join(root, "chat", "synthetic.txt");
    await fs.mkdir(path.dirname(original), { recursive: true });
    await fs.writeFile(original, "synthetic");

    await expect(
      quarantineUserOwnedUploadFiles(
        ["/uploads/chat/synthetic.txt", "/uploads/../outside.txt"],
        root,
      ),
    ).rejects.toThrow(/escaped the upload directory/i);
    await expect(fs.readFile(original, "utf8")).resolves.toBe("synthetic");
  });
});
