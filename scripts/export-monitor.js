const fs = require("fs");
const path = require("path");

const sourceDir = path.resolve(__dirname, "../");
const destDir = path.resolve(
  __dirname,
  "../../../YOUR_TARGET_PROJECT/src/monitor"
); // burayı hedef projene göre ayarla

const filesToCopy = [
  "MonitoringTool.tsx", // ✅ eklendi
  "MonitoringService.ts",
  "MonitoringDashboard.tsx",
  "styles.tsx",
  "types.ts",
  "utils/indexedDB.ts",
  "hooks.ts",
];

fs.mkdirSync(path.join(destDir, "utils"), { recursive: true });
fs.mkdirSync(path.join(destDir, "hooks"), { recursive: true });

filesToCopy.forEach((file) => {
  const srcPath = path.join(sourceDir, file);
  let destPath;

  if (file.startsWith("utils/")) {
    destPath = path.join(destDir, "utils", path.basename(file));
  } else if (file === "hooks.ts") {
    destPath = path.join(destDir, "hooks", "useIndexedDB.ts");
  } else {
    destPath = path.join(destDir, path.basename(file));
  }

  fs.copyFileSync(srcPath, destPath);
  console.log(`✔️  Copied ${file} to ${destPath}`);
});

console.log("✅ Monitor tool exported to your project.");
