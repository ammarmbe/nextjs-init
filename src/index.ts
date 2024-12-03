#!/usr/bin/env node

import { select } from "@inquirer/prompts";
import { execSync } from "child_process";
import { createSpinner } from "nanospinner";
import fs from "fs-extra";
import path, { dirname } from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";
import degit from "degit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ProjectInitializer {
  colors = ["red", "green", "blue", "orange", "cyan", "purple"] as const;
  packageManagers = [
    { manager: "npm", executer: "npx" },
    { manager: "pnpm", executer: "pnpx" },
    { manager: "yarn", executer: "yarn dlx" },
    { manager: "bun", executer: "bunx" },
  ];

  packageManager: (typeof this.packageManagers)[number] = {
    manager: "npm",
    executer: "npx",
  };
  ORM: "prisma" | "neon" | null | undefined = undefined;
  data: "client" | "server" | undefined = undefined;
  auth: "username" | "google" | null | undefined = undefined;
  color: (typeof this.colors)[number] | undefined = undefined;

  projectName = process.cwd().split("\\").pop()?.split("/").pop();

  spinner: ReturnType<typeof createSpinner> | undefined = undefined;

  constructor() {
    process.on("uncaughtException", (error) => {
      if (!(error instanceof Error && error.name === "ExitPromptError")) {
        throw error;
      } else {
        console.log("");
        process.exit(1);
      }
    });

    // Change the working directory to the current directory
    process.chdir(process.cwd());
  }

  spin(message: string | undefined) {
    if (this.spinner) {
      this.spinner.success();
    }

    if (message) {
      this.spinner = createSpinner(message).start();
    }
  }

  exectute(command: string, execute?: boolean) {
    execSync(
      `${
        execute ? this.packageManager.executer : this.packageManager.manager
      } ${command}`,
      { stdio: [] }
    );
  }

  async copy(source: string, destination: string) {
    await fs.copy(
      path.join(__dirname, "..", source),
      path.join(process.cwd(), destination)
    );
  }

  async del(filePath: string) {
    await fs.remove(path.join(process.cwd(), filePath));
  }

  async rename(filePath: string, oldName: string, newName: string) {
    await fs.rename(
      path.join(process.cwd(), filePath, oldName),
      path.join(process.cwd(), filePath, newName)
    );
  }

  getAvailablePackageManagers() {
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

  async initiateProject() {
    await degit("ammarmbe/template").clone(process.cwd());

    this.exectute("install");

    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
    packageJson.name = this.projectName;

    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  async initiateORM() {
    await this.copy("files/ORM/.env.example", ".env");

    switch (this.ORM) {
      case "prisma":
        await this.copy("files/ORM/prisma.db.ts", "src/utils/db.ts");

        this.exectute("install prisma");
        this.exectute("prisma init", true);

        break;
      case "neon":
        await this.copy("files/ORM/neon.db.ts", "src/utils/db.ts");

        this.exectute("install @neondatabase/serverless");

        break;
    }
  }

  async initiateData() {
    switch (this.data) {
      case "client":
        this.exectute(
          "install @tanstack/react-query @trpc/client@next @trpc/react-query@next @trpc/server@next server-only superjson"
        );

        await this.copy("files/data/client/trpc", "src/trpc");
        await this.copy("files/data/client/server", "src/server");
        await this.copy("files/data/client/api", "src/app/api");

        await this.del("src/app/layout.tsx");
        await this.copy("files/data/client/layout.tsx", "src/app/layout.tsx");

        if (this.auth) {
          await this.copy(
            "files/data/client/auth.trpc.ts",
            "src/server/trpc.ts"
          );
        } else {
          await this.copy("files/data/client/trpc.ts", "src/server/trpc.ts");
        }

        break;
      case "server":
        await this.copy("files/data/server/data", "src/data");

        break;
    }
  }

  async updateEnv() {
    const envPath = path.join(process.cwd(), ".env");

    let env = await fs.readFile(envPath, "utf-8");

    env += `\nGOOGLE_CLIENT_ID=""\n`;
    env += `GOOGLE_CLIENT_SECRET=""\n`;
    env += `GOOGLE_REDIRECT_URL="http://localhost:3000/api/login/callback"\n`;

    await fs.writeFile(envPath, env);
  }

  async initiateAuth() {
    await this.copy("files/auth/(authenticated)", "src/app/(authenticated)");
    await this.copy("files/auth/middleware.ts", "src/middleware.ts");

    if (this.ORM === "prisma") {
      await this.copy("files/auth/prisma.auth.ts", "src/utils/auth.ts");
    } else {
      await this.copy("files/auth/neon.auth.ts", "src/utils/auth.ts");
    }

    switch (this.auth) {
      case "username":
        this.exectute("install @oslojs/crypto @oslojs/encoding");

        await this.copy("files/auth/username/login", "src/app/login");
        await this.copy("files/auth/username/schemas", "src/schemas");

        if (this.ORM === "prisma") {
          await this.del("primsa/schema.prisma");

          await this.copy(
            "files/auth/username/prisma/schema.prisma",
            "prisma/schema.prisma"
          );

          await this.del("src/app/login/neon.action.ts");
          await this.rename("src/app/login/", "prisma.action.ts", "action.ts");
        } else {
          await this.copy(
            "files/auth/username/neon/schema.sql",
            "src/utils/schema.sql"
          );

          await this.del("src/app/login/prisma.action.ts");
          await this.rename("src/app/login/", "neon.action.ts", "action.ts");
        }

        break;
      case "google":
        this.exectute("install @oslojs/crypto @oslojs/encoding arctic");

        await this.copy("files/auth/google/api", "src/app/api");

        this.updateEnv();

        if (this.ORM === "prisma") {
          await this.del("primsa/schema.prisma");

          await this.copy(
            "files/auth/google/prisma/schema.prisma",
            "prisma/schema.prisma"
          );

          await this.del("src/app/api/login/callback/neon.route.ts");
          await this.rename(
            "src/app/api/login/callback",
            "prisma.route.ts",
            "route.ts"
          );
        } else {
          await this.copy(
            "files/auth/google/neon/schema.sql",
            "src/utils/schema.sql"
          );

          await this.del("src/app/api/login/callback/prisma.route.ts");
          await this.rename(
            "src/app/api/login/callback",
            "neon.route.ts",
            "route.ts"
          );
        }

        break;
    }
  }

  async updateColor() {
    if (!this.color) {
      return;
    }

    const layoutPath = path.join(process.cwd(), "src", "app", "layout.tsx");

    let layout = await fs.readFile(layoutPath, "utf-8");

    layout = layout.replace("purple", this.color);

    await fs.writeFile(layoutPath, layout);
  }

  async main() {
    const files = await fs.readdir(process.cwd());

    if (files.length === 1 && files[0] === ".git") {
      await fs.remove(path.join(process.cwd(), ".git"));
    } else if (files.length > 0) {
      console.log(
        chalk.red(
          "The current directory is not empty. Please run this command in an empty directory."
        )
      );

      console.log("");
      process.exit(1);
    }

    const packageManagers = this.getAvailablePackageManagers();

    const selectedPackageManager = await select({
      message: "Which package manager would you like to use?",
      default: "bun",
      choices: [
        { value: "bun", name: "bun", disabled: !packageManagers.bun },
        { value: "npm", name: "npm", disabled: !packageManagers.npm },
        { value: "pnpm", name: "pnpm", disabled: !packageManagers.pnpm },
        { value: "yarn", name: "yarn", disabled: !packageManagers.yarn },
      ],
    });

    this.packageManager =
      this.packageManagers.find((x) => x.manager === selectedPackageManager) ??
      this.packageManager;

    this.ORM = await select({
      message: "Which ORM would you like to use?",
      choices: [
        { value: "prisma", name: "Prisma" },
        { value: "neon", name: "Neon driver" },
        { value: null, name: "None" },
      ],
    });

    if (this.ORM) {
      this.data = await select({
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

      this.auth = await select({
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
            value: null,
            name: "None",
          },
        ],
      });
    }

    this.color = await select({
      message: "Select a brand color:",
      choices: this.colors.map((color) => ({
        value: color,
        name: color.charAt(0).toUpperCase() + color.slice(1),
      })),
    });

    console.log("");
    console.log(chalk.green(`Creating project ${this.projectName}`));
    console.log("");

    this.spin(`Installing dependencies using ${this.packageManager.manager}`);

    await this.initiateProject();

    if (this.ORM) {
      this.spin(
        `Setting up ${this.ORM.charAt(0).toUpperCase() + this.ORM.slice(1)}`
      );

      await this.initiateORM();
    }

    if (this.data) {
      this.spin(
        `Setting up data fetching (${
          this.data === "client" ? "tRPC and @tanstack/query" : "RSC"
        })`
      );

      await this.initiateData();
    }

    if (this.auth) {
      this.spin(
        `Setting up ${
          this.auth === "username" ? "username and password" : "Google OAuth"
        }`
      );

      await this.initiateAuth();
    }

    this.spin(`Adding ${this.color} as the brand color`);

    await this.updateColor();

    this.spin(undefined);
    console.log("");

    console.log(
      chalk.green(`Project ${this.projectName} created successfully!`)
    );
    console.log("");
  }
}

const initializer = new ProjectInitializer();

await initializer.main();
