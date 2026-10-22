import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

// Autolinking silently leaves a local module out of the build when it cannot find it.
const withIos = readdirSync(__dirname).filter((dir) => existsSync(join(__dirname, dir, "ios")));

describe("local native modules", () => {
  it("are searched in src/modules", () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf8"));
    expect(pkg.expo.autolinking.nativeModulesDir).toBe("src/modules");
  });

  it.each(withIos)("%s ships a podspec and a module config for iOS", (dir) => {
    expect(readdirSync(join(__dirname, dir, "ios")).some((file) => file.endsWith(".podspec"))).toBe(true);
    expect(existsSync(join(__dirname, dir, "expo-module.config.json"))).toBe(true);
  });
});
