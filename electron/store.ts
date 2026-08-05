import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import type { LicenseStatus, Platform, StoreShape } from "../shared/types";

const DEFAULT_LICENSE: LicenseStatus = {
  activated: false,
  key: "",
  email: "",
  plan: "free",
  deviceId: "",
  activatedAt: "",
};

const DEFAULTS: StoreShape = {
  language: "ar",
  theme: "dark",
  outputDir: "",
  defaultPlatform: "tiktok",
  defaultMode: "safe",
  recentExports: [],
  installedPacks: [],
  lastVersion: "",
  license: DEFAULT_LICENSE,
};

class JsonStore {
  private file: string;
  private data: StoreShape;

  constructor() {
    this.file = path.join(app.getPath("userData"), "settings.json");
    this.data = this.load();
  }

  private load(): StoreShape {
    try {
      if (fs.existsSync(this.file)) {
        const raw = JSON.parse(fs.readFileSync(this.file, "utf8"));
        return { ...DEFAULTS, ...raw, license: { ...DEFAULT_LICENSE, ...(raw.license || {}) } };
      }
    } catch {
      /* corrupted store -> reset */
    }
    return { ...DEFAULTS, license: { ...DEFAULT_LICENSE } };
  }

  private save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2), "utf8");
    } catch {
      /* ignore write errors */
    }
  }

  get<K extends keyof StoreShape>(key: K): StoreShape[K] {
    return this.data[key];
  }

  set<K extends keyof StoreShape>(key: K, value: StoreShape[K]): void {
    this.data[key] = value;
    this.save();
  }

  getAll(): StoreShape {
    return this.data;
  }

  reset(): void {
    this.data = { ...DEFAULTS, license: { ...DEFAULT_LICENSE } };
    this.save();
  }
}

export const store = new JsonStore();
