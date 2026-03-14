import { test, expect, vi, beforeEach, describe } from "vitest";

// Must mock server-only modules before importing the module under test
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const mockCreateSession = vi.fn();
const mockDeleteSession = vi.fn();
const mockGetSession = vi.fn();

vi.mock("@/lib/auth", () => ({
  createSession: (...args: any[]) => mockCreateSession(...args),
  deleteSession: (...args: any[]) => mockDeleteSession(...args),
  getSession: (...args: any[]) => mockGetSession(...args),
}));

const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: any[]) => mockUserFindUnique(...args),
      create: (...args: any[]) => mockUserCreate(...args),
    },
  },
}));

const mockBcryptHash = vi.fn();
const mockBcryptCompare = vi.fn();

vi.mock("bcrypt", () => ({
  default: {
    hash: (...args: any[]) => mockBcryptHash(...args),
    compare: (...args: any[]) => mockBcryptCompare(...args),
  },
  hash: (...args: any[]) => mockBcryptHash(...args),
  compare: (...args: any[]) => mockBcryptCompare(...args),
}));

// Dynamic import after mocks are set up
const { signUp, signIn, getUser } = await import("@/actions");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signUp", () => {
  test("returns success when registration is valid", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockBcryptHash.mockResolvedValue("hashed-password");
    mockUserCreate.mockResolvedValue({ id: "user-1", email: "new@example.com" });
    mockCreateSession.mockResolvedValue(undefined);

    const result = await signUp("new@example.com", "password123");

    expect(result).toEqual({ success: true });
    expect(mockUserCreate).toHaveBeenCalledWith({
      data: { email: "new@example.com", password: "hashed-password" },
    });
    expect(mockCreateSession).toHaveBeenCalledWith("user-1", "new@example.com");
  });

  test("returns error when email is missing", async () => {
    const result = await signUp("", "password123");

    expect(result).toEqual({
      success: false,
      error: "Email and password are required",
    });
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  test("returns error when password is missing", async () => {
    const result = await signUp("test@example.com", "");

    expect(result).toEqual({
      success: false,
      error: "Email and password are required",
    });
  });

  test("returns error when password is shorter than 8 characters", async () => {
    const result = await signUp("test@example.com", "short");

    expect(result).toEqual({
      success: false,
      error: "Password must be at least 8 characters",
    });
  });

  test("returns error when email is already registered", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "existing",
      email: "taken@example.com",
    });

    const result = await signUp("taken@example.com", "password123");

    expect(result).toEqual({ success: false, error: "Email already registered" });
    expect(mockUserCreate).not.toHaveBeenCalled();
  });

  test("returns generic error on unexpected exception", async () => {
    mockUserFindUnique.mockRejectedValue(new Error("DB error"));

    const result = await signUp("test@example.com", "password123");

    expect(result).toEqual({
      success: false,
      error: "An error occurred during sign up",
    });
  });
});

describe("signIn", () => {
  test("returns success with valid credentials", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      password: "hashed",
    });
    mockBcryptCompare.mockResolvedValue(true);
    mockCreateSession.mockResolvedValue(undefined);

    const result = await signIn("user@example.com", "password123");

    expect(result).toEqual({ success: true });
    expect(mockCreateSession).toHaveBeenCalledWith("user-1", "user@example.com");
  });

  test("returns error when email is missing", async () => {
    const result = await signIn("", "password123");

    expect(result).toEqual({
      success: false,
      error: "Email and password are required",
    });
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  test("returns error when password is missing", async () => {
    const result = await signIn("user@example.com", "");

    expect(result).toEqual({
      success: false,
      error: "Email and password are required",
    });
  });

  test("returns invalid credentials when user not found", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const result = await signIn("unknown@example.com", "password123");

    expect(result).toEqual({ success: false, error: "Invalid credentials" });
    expect(mockBcryptCompare).not.toHaveBeenCalled();
  });

  test("returns invalid credentials when password is wrong", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      password: "hashed",
    });
    mockBcryptCompare.mockResolvedValue(false);

    const result = await signIn("user@example.com", "wrongpass");

    expect(result).toEqual({ success: false, error: "Invalid credentials" });
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  test("returns generic error on unexpected exception", async () => {
    mockUserFindUnique.mockRejectedValue(new Error("DB down"));

    const result = await signIn("user@example.com", "password123");

    expect(result).toEqual({
      success: false,
      error: "An error occurred during sign in",
    });
  });
});

describe("getUser", () => {
  test("returns user data when session is valid", async () => {
    mockGetSession.mockResolvedValue({
      userId: "user-1",
      email: "user@example.com",
    });
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      createdAt: new Date("2024-01-01"),
    });

    const result = await getUser();

    expect(result).toMatchObject({
      id: "user-1",
      email: "user@example.com",
    });
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { id: true, email: true, createdAt: true },
    });
  });

  test("returns null when no session exists", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await getUser();

    expect(result).toBeNull();
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  test("returns null when user is not found in database", async () => {
    mockGetSession.mockResolvedValue({ userId: "ghost", email: "ghost@example.com" });
    mockUserFindUnique.mockResolvedValue(null);

    const result = await getUser();

    expect(result).toBeNull();
  });

  test("returns null on database error", async () => {
    mockGetSession.mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    mockUserFindUnique.mockRejectedValue(new Error("DB error"));

    const result = await getUser();

    expect(result).toBeNull();
  });
});
