import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { google } from "googleapis";

const packageName = "cloud.unalabs.jobagent";
const language = "en-US";
const root = process.cwd();
const metadataRoot = path.join(root, "store", "metadata", "google", language);
const assetRoot = path.join(root, "store", "assets", "google");

const credentialsJson =
  process.env.JOBAGENT_PLAY_SERVICE_ACCOUNT_JSON ||
  process.env.PEACEPAD_PLAY_SERVICE_ACCOUNT_JSON;

if (!credentialsJson) {
  throw new Error("Missing JobAgent Google Play service-account credentials");
}

const readText = (fileName) =>
  fs.readFileSync(path.join(metadataRoot, fileName), "utf8").trim();

const files = {
  icon: [path.join(assetRoot, "icon-512.png")],
  featureGraphic: [path.join(assetRoot, "feature-graphic-1024x500.png")],
  phoneScreenshots: fs
    .readdirSync(path.join(assetRoot, "phone"))
    .filter((name) => name.toLowerCase().endsWith(".png"))
    .sort()
    .map((name) => path.join(assetRoot, "phone", name)),
};

for (const file of Object.values(files).flat()) {
  if (!fs.existsSync(file)) throw new Error(`Missing Play listing asset: ${file}`);
}

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(credentialsJson),
  scopes: ["https://www.googleapis.com/auth/androidpublisher"],
});
const publisher = google.androidpublisher({ version: "v3", auth });
const edit = await publisher.edits.insert({ packageName });
const editId = edit.data.id;

if (!editId) throw new Error("Google Play did not return an edit ID");

try {
  await publisher.edits.listings.update({
    packageName,
    editId,
    language,
    requestBody: {
      title: readText("title.txt"),
      shortDescription: readText("short_description.txt"),
      fullDescription: readText("full_description.txt"),
    },
  });

  for (const [imageType, imageFiles] of Object.entries(files)) {
    await publisher.edits.images.deleteall({
      packageName,
      editId,
      language,
      imageType,
    });

    for (const file of imageFiles) {
      await publisher.edits.images.upload({
        packageName,
        editId,
        language,
        imageType,
        media: { mimeType: "image/png", body: fs.createReadStream(file) },
      });
    }
  }

  const committed = await publisher.edits.commit({ packageName, editId });
  console.log(
    JSON.stringify(
      {
        packageName,
        language,
        editId: committed.data.id || editId,
        uploaded: Object.fromEntries(
          Object.entries(files).map(([type, imageFiles]) => [type, imageFiles.length]),
        ),
      },
      null,
      2,
    ),
  );
} catch (error) {
  await publisher.edits.delete({ packageName, editId }).catch(() => undefined);
  throw error;
}
