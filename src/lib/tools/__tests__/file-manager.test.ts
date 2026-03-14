import { test, expect, vi, beforeEach, describe } from "vitest";
import { buildFileManagerTool } from "../file-manager";

vi.mock("ai", () => ({
  tool: (config: any) => config,
}));

const mockFileSystem = {
  rename: vi.fn(),
  deleteFile: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildFileManagerTool - rename", () => {
  test("returns success when rename succeeds", async () => {
    mockFileSystem.rename.mockReturnValue(true);
    const tool = buildFileManagerTool(mockFileSystem as any);

    const result = await tool.execute({
      command: "rename",
      path: "/old/path.ts",
      new_path: "/new/path.ts",
    });

    expect(mockFileSystem.rename).toHaveBeenCalledWith(
      "/old/path.ts",
      "/new/path.ts"
    );
    expect(result).toMatchObject({ success: true });
    expect((result as any).message).toContain("/old/path.ts");
    expect((result as any).message).toContain("/new/path.ts");
  });

  test("returns failure when rename fails", async () => {
    mockFileSystem.rename.mockReturnValue(false);
    const tool = buildFileManagerTool(mockFileSystem as any);

    const result = await tool.execute({
      command: "rename",
      path: "/missing.ts",
      new_path: "/dest.ts",
    });

    expect(result).toMatchObject({ success: false });
    expect((result as any).error).toContain("/missing.ts");
  });

  test("returns error when new_path is missing", async () => {
    const tool = buildFileManagerTool(mockFileSystem as any);

    const result = await tool.execute({ command: "rename", path: "/file.ts" });

    expect(mockFileSystem.rename).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: false });
    expect((result as any).error).toMatch(/new_path/i);
  });
});

describe("buildFileManagerTool - delete", () => {
  test("returns success when delete succeeds", async () => {
    mockFileSystem.deleteFile.mockReturnValue(true);
    const tool = buildFileManagerTool(mockFileSystem as any);

    const result = await tool.execute({
      command: "delete",
      path: "/remove-me.ts",
    });

    expect(mockFileSystem.deleteFile).toHaveBeenCalledWith("/remove-me.ts");
    expect(result).toMatchObject({ success: true });
    expect((result as any).message).toContain("/remove-me.ts");
  });

  test("returns failure when delete fails", async () => {
    mockFileSystem.deleteFile.mockReturnValue(false);
    const tool = buildFileManagerTool(mockFileSystem as any);

    const result = await tool.execute({
      command: "delete",
      path: "/nonexistent.ts",
    });

    expect(result).toMatchObject({ success: false });
    expect((result as any).error).toContain("/nonexistent.ts");
  });
});

describe("buildFileManagerTool - tool shape", () => {
  test("has a description", () => {
    const tool = buildFileManagerTool(mockFileSystem as any);
    expect(typeof tool.description).toBe("string");
    expect(tool.description.length).toBeGreaterThan(0);
  });

  test("has parameters and execute", () => {
    const tool = buildFileManagerTool(mockFileSystem as any);
    expect(tool.parameters).toBeDefined();
    expect(typeof tool.execute).toBe("function");
  });
});
