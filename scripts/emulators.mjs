// Jalankan Auth + Firestore emulator dengan data persisten di .emulator-data/
// (diimpor bila ada, diekspor saat emulator dihentikan), supaya akun demo tidak hilang setelah restart.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const dir = ".emulator-data";
const args = ["firebase", "emulators:start", "--only", "auth,firestore", "--project", "demo-panggung", `--export-on-exit=${dir}`];
if (existsSync(`${dir}/firebase-export-metadata.json`)) args.push(`--import=${dir}`);

const child = spawn("npx", args, { stdio: "inherit", shell: process.platform === "win32" });
child.on("exit", (code) => process.exit(code ?? 0));
