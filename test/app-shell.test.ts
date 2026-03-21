import { describe, test, expect } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const componentsDir = resolve(__dirname, "../src/components");

describe("App Shell Structure", () => {
  const requiredComponents = [
    "AppShell.vue",
    "TabBar.vue",
    "Toolbar.vue",
    "SubToolbar.vue",
    "CanvasViewport.vue",
  ];

  for (const component of requiredComponents) {
    test(`${component} exists`, () => {
      expect(existsSync(resolve(componentsDir, component))).toBe(true);
    });
  }

  test("AppShell imports all child components", () => {
    const content = readFileSync(
      resolve(componentsDir, "AppShell.vue"),
      "utf-8",
    );
    expect(content).toContain("TabBar");
    expect(content).toContain("Toolbar");
    expect(content).toContain("SubToolbar");
    expect(content).toContain("CanvasViewport");
  });

  test("AppShell uses flexbox column layout", () => {
    const content = readFileSync(
      resolve(componentsDir, "AppShell.vue"),
      "utf-8",
    );
    expect(content).toContain("flex-direction: column");
    expect(content).toContain("height: 100vh");
  });

  test("CanvasViewport fills remaining space", () => {
    const content = readFileSync(
      resolve(componentsDir, "CanvasViewport.vue"),
      "utf-8",
    );
    expect(content).toContain("flex: 1");
    expect(content).toContain("position: relative");
  });

  test("TabBar and Toolbar do not shrink", () => {
    const tabBar = readFileSync(
      resolve(componentsDir, "TabBar.vue"),
      "utf-8",
    );
    const toolbar = readFileSync(
      resolve(componentsDir, "Toolbar.vue"),
      "utf-8",
    );
    expect(tabBar).toContain("flex-shrink: 0");
    expect(toolbar).toContain("flex-shrink: 0");
  });

  test("all components use semantic tokens not Flexoki primitives", () => {
    for (const component of requiredComponents) {
      const content = readFileSync(
        resolve(componentsDir, component),
        "utf-8",
      );
      // Should not contain direct Flexoki references in styles
      expect(content).not.toMatch(/var\(--flexoki-/);
    }
  });

  test("App.vue uses AppShell", () => {
    const app = readFileSync(resolve(__dirname, "../src/App.vue"), "utf-8");
    expect(app).toContain("AppShell");
  });
});
