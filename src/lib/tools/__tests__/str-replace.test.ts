import { test, expect, vi, beforeEach, describe } from "vitest";
import { buildStrReplaceTool } from "../str-replace";

const mockFileSystem = {
  viewFile: vi.fn(),
  createFileWithParents: vi.fn(),
  replaceInFile: vi.fn(),
  insertInFile: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildStrReplaceTool - view", () => {
  test("calls viewFile with path", async () => {
    mockFileSystem.viewFile.mockReturnValue("file content");
    const tool = buildStrReplaceTool(mockFileSystem as any);

    const result = await tool.execute({ command: "view", path: "/App.jsx" });

    expect(mockFileSystem.viewFile).toHaveBeenCalledWith("/App.jsx", undefined);
    expect(result).toBe("file content");
  });

  test("calls viewFile with view_range", async () => {
    mockFileSystem.viewFile.mockReturnValue("lines 1-5");
    const tool = buildStrReplaceTool(mockFileSystem as any);

    const result = await tool.execute({
      command: "view",
      path: "/App.jsx",
      view_range: [1, 5],
    });

    expect(mockFileSystem.viewFile).toHaveBeenCalledWith("/App.jsx", [1, 5]);
    expect(result).toBe("lines 1-5");
  });
});

describe("buildStrReplaceTool - create", () => {
  test("calls createFileWithParents with path and content", async () => {
    mockFileSystem.createFileWithParents.mockReturnValue("File created");
    const tool = buildStrReplaceTool(mockFileSystem as any);

    const result = await tool.execute({
      command: "create",
      path: "/components/Button.tsx",
      file_text: "export const Button = () => <button />;",
    });

    expect(mockFileSystem.createFileWithParents).toHaveBeenCalledWith(
      "/components/Button.tsx",
      "export const Button = () => <button />;"
    );
    expect(result).toBe("File created");
  });

  test("defaults to empty string when file_text is omitted", async () => {
    mockFileSystem.createFileWithParents.mockReturnValue("File created");
    const tool = buildStrReplaceTool(mockFileSystem as any);

    await tool.execute({ command: "create", path: "/empty.ts" });

    expect(mockFileSystem.createFileWithParents).toHaveBeenCalledWith(
      "/empty.ts",
      ""
    );
  });
});

describe("buildStrReplaceTool - str_replace", () => {
  test("calls replaceInFile with path, old_str, new_str", async () => {
    mockFileSystem.replaceInFile.mockReturnValue("Replaced successfully");
    const tool = buildStrReplaceTool(mockFileSystem as any);

    const result = await tool.execute({
      command: "str_replace",
      path: "/App.jsx",
      old_str: "const x = 1;",
      new_str: "const x = 2;",
    });

    expect(mockFileSystem.replaceInFile).toHaveBeenCalledWith(
      "/App.jsx",
      "const x = 1;",
      "const x = 2;"
    );
    expect(result).toBe("Replaced successfully");
  });

  test("defaults old_str and new_str to empty string when omitted", async () => {
    mockFileSystem.replaceInFile.mockReturnValue("ok");
    const tool = buildStrReplaceTool(mockFileSystem as any);

    await tool.execute({ command: "str_replace", path: "/App.jsx" });

    expect(mockFileSystem.replaceInFile).toHaveBeenCalledWith(
      "/App.jsx",
      "",
      ""
    );
  });
});

describe("buildStrReplaceTool - insert", () => {
  test("calls insertInFile with path, line, and new content", async () => {
    mockFileSystem.insertInFile.mockReturnValue("Inserted successfully");
    const tool = buildStrReplaceTool(mockFileSystem as any);

    const result = await tool.execute({
      command: "insert",
      path: "/App.jsx",
      insert_line: 3,
      new_str: "const added = true;",
    });

    expect(mockFileSystem.insertInFile).toHaveBeenCalledWith(
      "/App.jsx",
      3,
      "const added = true;"
    );
    expect(result).toBe("Inserted successfully");
  });

  test("defaults insert_line to 0 and new_str to empty string when omitted", async () => {
    mockFileSystem.insertInFile.mockReturnValue("ok");
    const tool = buildStrReplaceTool(mockFileSystem as any);

    await tool.execute({ command: "insert", path: "/App.jsx" });

    expect(mockFileSystem.insertInFile).toHaveBeenCalledWith("/App.jsx", 0, "");
  });
});

describe("buildStrReplaceTool - undo_edit", () => {
  test("returns an unsupported error message", async () => {
    const tool = buildStrReplaceTool(mockFileSystem as any);

    const result = await tool.execute({
      command: "undo_edit",
      path: "/App.jsx",
    });

    expect(result).toMatch(/not supported/i);
    expect(mockFileSystem.viewFile).not.toHaveBeenCalled();
    expect(mockFileSystem.replaceInFile).not.toHaveBeenCalled();
  });
});

describe("buildStrReplaceTool - tool shape", () => {
  test("returns tool with correct id", () => {
    const tool = buildStrReplaceTool(mockFileSystem as any);
    expect(tool.id).toBe("str_replace_editor");
  });

  test("returns tool with parameters schema", () => {
    const tool = buildStrReplaceTool(mockFileSystem as any);
    expect(tool.parameters).toBeDefined();
  });

  test("returns tool with execute function", () => {
    const tool = buildStrReplaceTool(mockFileSystem as any);
    expect(typeof tool.execute).toBe("function");
  });
});
