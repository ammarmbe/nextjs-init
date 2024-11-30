#!/usr/bin/env node

import { select } from "@inquirer/prompts";
import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";

let packageManager: "npm" | "pnpm" | "yarn" | "bun" = "npm";
const colors = ["red", "green", "blue", "orange", "cyan", "purple"] as const;

// Prevent the process from erroring out when the user exits the prompt
process.on("uncaughtException", (error) => {
  if (!(error instanceof Error && error.name === "ExitPromptError")) {
    throw error;
  } else {
    console.log("");
    process.exit(1);
  }
});

function exectute(command: string) {
  execSync(`${packageManager} ${command}`, { stdio: [] });
}

function copy(source: string, destination: string) {
  fs.copy(path.join(__dirname, source), path.join(process.cwd(), destination));
}

function del(filePath: string) {
  fs.remove(path.join(process.cwd(), filePath));
}

function rename(filePath: string, oldName: string, newName: string) {
  fs.rename(
    path.join(process.cwd(), filePath, oldName),
    path.join(process.cwd(), filePath, newName)
  );
}

function getAvailablePackageManagers() {
  let pnpm = false;
  let yarn = false;
  let bun = false;

  try {
    execSync("bun --version", { stdio: "ignore" });

    bun = true;
  } catch {}

  try {
    execSync("yarn --version", { stdio: "ignore" });

    yarn = true;
  } catch {}

  try {
    execSync("pnpm --version", { stdio: "ignore" });

    pnpm = true;
  } catch {}

  return {
    npm: true,
    pnpm,
    yarn,
    bun,
  };
}

function initiateProject() {
  copy("src/template", "");

  exectute("install");
}

async function main() {
  const packageManagers = getAvailablePackageManagers();

  // Change the working directory to the current directory
  process.chdir(process.cwd());

  let ORM: "prisma" | "neon" | "none";
  let data: "client" | "server";
  let auth: "username" | "google" | "none";
  let color: (typeof colors)[number];

  packageManager = await select({
    message: "Which package manager would you like to use?",
    default: "bun",
    choices: [
      { value: "bun", name: "bun", disabled: !packageManagers.bun },
      { value: "npm", name: "npm", disabled: !packageManagers.npm },
      { value: "pnpm", name: "pnpm", disabled: !packageManagers.pnpm },
      { value: "yarn", name: "yarn", disabled: !packageManagers.yarn },
    ],
  });

  ORM = await select({
    message: "Which ORM would you like to use?",
    choices: [
      { value: "prisma", name: "Prisma" },
      { value: "neon", name: "Neon driver" },
      { value: "none", name: "None" },
    ],
  });

  // Skip the data and auth prompts if the user doesn't want to use an ORM
  if (ORM !== "none") {
    data = await select({
      message: "Where do you plan on fetching your data?",
      choices: [
        {
          value: "client",
          name: "Client",
          description: "tRPC and @tanstack/query",
        },
        {
          value: "server",
          name: "Server",
          description: "RSC",
        },
      ],
    });

    auth = await select({
      message: "How to do want to authenticate users?",
      choices: [
        {
          value: "username",
          name: "Username and password",
        },
        {
          value: "google",
          name: "Google OAuth",
        },
        {
          value: "none",
          name: "None",
        },
      ],
    });
  }

  color = await select({
    message: "Select a brand color:",
    choices: colors.map((color) => ({
      value: color,
      name: color.charAt(0).toUpperCase() + color.slice(1),
    })),
  });

  initiateProject();
}

main();
