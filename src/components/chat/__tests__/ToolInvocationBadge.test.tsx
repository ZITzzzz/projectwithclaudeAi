import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge, getToolLabel } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

describe("getToolLabel", () => {
  describe("str_replace_editor", () => {
    it("create → Creating <file>", () => {
      expect(getToolLabel("str_replace_editor", { command: "create", path: "/App.jsx" }))
        .toBe("Creating App.jsx");
    });

    it("str_replace → Editing <file>", () => {
      expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "/components/Button.tsx" }))
        .toBe("Editing Button.tsx");
    });

    it("insert → Inserting into <file>", () => {
      expect(getToolLabel("str_replace_editor", { command: "insert", path: "/App.jsx" }))
        .toBe("Inserting into App.jsx");
    });

    it("view → Viewing <file>", () => {
      expect(getToolLabel("str_replace_editor", { command: "view", path: "/src/index.ts" }))
        .toBe("Viewing index.ts");
    });

    it("undo_edit → Undoing edit in <file>", () => {
      expect(getToolLabel("str_replace_editor", { command: "undo_edit", path: "/App.jsx" }))
        .toBe("Undoing edit in App.jsx");
    });

    it("unknown command falls back to Editing <file>", () => {
      expect(getToolLabel("str_replace_editor", { command: "unknown", path: "/App.jsx" }))
        .toBe("Editing App.jsx");
    });

    it("missing path falls back to 'file'", () => {
      expect(getToolLabel("str_replace_editor", { command: "create" }))
        .toBe("Creating file");
    });

    it("empty args falls back gracefully", () => {
      expect(getToolLabel("str_replace_editor", {}))
        .toBe("Editing file");
    });

    it("extracts filename from nested path", () => {
      expect(getToolLabel("str_replace_editor", { command: "create", path: "/src/components/ui/Card.tsx" }))
        .toBe("Creating Card.tsx");
    });
  });

  describe("file_manager", () => {
    it("rename → Renaming <old> → <new>", () => {
      expect(getToolLabel("file_manager", { command: "rename", path: "/old.jsx", new_path: "/new.jsx" }))
        .toBe("Renaming old.jsx → new.jsx");
    });

    it("rename with nested paths uses filenames only", () => {
      expect(getToolLabel("file_manager", { command: "rename", path: "/src/Foo.tsx", new_path: "/src/Bar.tsx" }))
        .toBe("Renaming Foo.tsx → Bar.tsx");
    });

    it("rename missing new_path falls back to 'file'", () => {
      expect(getToolLabel("file_manager", { command: "rename", path: "/App.jsx" }))
        .toBe("Renaming App.jsx → file");
    });

    it("delete → Deleting <file>", () => {
      expect(getToolLabel("file_manager", { command: "delete", path: "/App.jsx" }))
        .toBe("Deleting App.jsx");
    });

    it("unknown command → Managing <file>", () => {
      expect(getToolLabel("file_manager", { command: "unknown", path: "/App.jsx" }))
        .toBe("Managing App.jsx");
    });
  });

  it("unknown tool returns the raw toolName", () => {
    expect(getToolLabel("some_other_tool", { command: "do_thing" }))
      .toBe("some_other_tool");
  });
});

describe("ToolInvocationBadge", () => {
  it("shows spinner while in-progress", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={{ toolCallId: "1", toolName: "str_replace_editor", state: "call", args: { command: "create", path: "/App.jsx" } }}
      />
    );
    expect(screen.getByTestId("spinner")).toBeDefined();
    expect(screen.queryByTestId("done-indicator")).toBeNull();
    expect(screen.getByText("Creating App.jsx")).toBeDefined();
  });

  it("shows spinner during partial-call", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={{ toolCallId: "1", toolName: "str_replace_editor", state: "partial-call", args: { command: "create", path: "/App.jsx" } }}
      />
    );
    expect(screen.getByTestId("spinner")).toBeDefined();
    expect(screen.queryByTestId("done-indicator")).toBeNull();
  });

  it("shows done indicator when result arrives", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={{ toolCallId: "1", toolName: "str_replace_editor", state: "result", args: { command: "create", path: "/App.jsx" }, result: "ok" }}
      />
    );
    expect(screen.getByTestId("done-indicator")).toBeDefined();
    expect(screen.queryByTestId("spinner")).toBeNull();
    expect(screen.getByText("Creating App.jsx")).toBeDefined();
  });

  it("renders str_replace label correctly", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={{ toolCallId: "1", toolName: "str_replace_editor", state: "result", args: { command: "str_replace", path: "/components/Card.tsx" }, result: "ok" }}
      />
    );
    expect(screen.getByText("Editing Card.tsx")).toBeDefined();
  });

  it("renders file_manager rename label correctly", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={{ toolCallId: "1", toolName: "file_manager", state: "result", args: { command: "rename", path: "/old.jsx", new_path: "/new.jsx" }, result: {} }}
      />
    );
    expect(screen.getByText("Renaming old.jsx → new.jsx")).toBeDefined();
  });

  it("renders file_manager delete label correctly", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={{ toolCallId: "1", toolName: "file_manager", state: "call", args: { command: "delete", path: "/unused.jsx" } }}
      />
    );
    expect(screen.getByText("Deleting unused.jsx")).toBeDefined();
  });

  it("falls back to raw toolName for unknown tools", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={{ toolCallId: "1", toolName: "mystery_tool", state: "call", args: {} }}
      />
    );
    expect(screen.getByText("mystery_tool")).toBeDefined();
  });
});
