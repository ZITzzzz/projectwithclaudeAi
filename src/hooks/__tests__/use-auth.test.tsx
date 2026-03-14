import { test, expect, vi, beforeEach, describe } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockRouterPush })),
}));

const mockSignInAction = vi.fn();
const mockSignUpAction = vi.fn();

vi.mock("@/actions", () => ({
  signIn: (...args: any[]) => mockSignInAction(...args),
  signUp: (...args: any[]) => mockSignUpAction(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: (...args: any[]) => mockGetAnonWorkData(...args),
  clearAnonWork: (...args: any[]) => mockClearAnonWork(...args),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: (...args: any[]) => mockGetProjects(...args),
}));

const mockCreateProject = vi.fn();
vi.mock("@/actions/create-project", () => ({
  createProject: (...args: any[]) => mockCreateProject(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "new-project-id" });
  cleanup();
});

describe("useAuth - signIn", () => {
  test("redirects to existing project on success when no anon work", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "proj-123" }]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockSignInAction).toHaveBeenCalledWith(
      "user@example.com",
      "password123"
    );
    expect(mockRouterPush).toHaveBeenCalledWith("/proj-123");
  });

  test("creates new project and redirects when no anon work and no existing projects", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "brand-new" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockCreateProject).toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith("/brand-new");
  });

  test("migrates anon work to new project on success", async () => {
    const anonMessages = [{ role: "user", content: "make a button" }];
    const anonFsData = { "/App.jsx": "code" };
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({
      messages: anonMessages,
      fileSystemData: anonFsData,
    });
    mockCreateProject.mockResolvedValue({ id: "migrated-project" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: anonMessages,
        data: anonFsData,
      })
    );
    expect(mockClearAnonWork).toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith("/migrated-project");
    expect(mockGetProjects).not.toHaveBeenCalled();
  });

  test("returns failure result without redirecting on signIn failure", async () => {
    mockSignInAction.mockResolvedValue({
      success: false,
      error: "Invalid credentials",
    });

    const { result } = renderHook(() => useAuth());

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signIn("bad@example.com", "wrong");
    });

    expect(returnValue).toEqual({
      success: false,
      error: "Invalid credentials",
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  test("isLoading is true during signIn and false after", async () => {
    let resolveSignIn!: (v: any) => void;
    mockSignInAction.mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      })
    );

    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.signIn("user@example.com", "pass");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignIn({ success: false, error: "bad" });
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe("useAuth - signUp", () => {
  test("redirects to new project after successful signUp with no anon work", async () => {
    mockSignUpAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "signup-project" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "secure-pass");
    });

    expect(mockSignUpAction).toHaveBeenCalledWith(
      "new@example.com",
      "secure-pass"
    );
    expect(mockRouterPush).toHaveBeenCalledWith("/signup-project");
  });

  test("returns failure result on signUp error", async () => {
    mockSignUpAction.mockResolvedValue({
      success: false,
      error: "Email already registered",
    });

    const { result } = renderHook(() => useAuth());

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signUp("taken@example.com", "pass");
    });

    expect(returnValue).toEqual({
      success: false,
      error: "Email already registered",
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  test("isLoading is false initially", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });
});
