import { test, expect, vi, beforeEach, afterEach, describe } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInForm } from "../SignInForm";

const mockSignIn = vi.fn();
let mockIsLoading = false;

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    isLoading: mockIsLoading,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockIsLoading = false;
});

afterEach(() => {
  cleanup();
});

describe("SignInForm - rendering", () => {
  test("renders email and password inputs", () => {
    render(<SignInForm />);

    expect(screen.getByLabelText(/email/i)).toBeDefined();
    expect(screen.getByLabelText(/password/i)).toBeDefined();
  });

  test("renders sign in button", () => {
    render(<SignInForm />);

    expect(screen.getByRole("button", { name: /sign in/i })).toBeDefined();
  });

  test("email input has correct type", () => {
    render(<SignInForm />);

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput.getAttribute("type")).toBe("email");
  });

  test("password input has correct type", () => {
    render(<SignInForm />);

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput.getAttribute("type")).toBe("password");
  });

  test("does not show error message initially", () => {
    render(<SignInForm />);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/failed/i)).toBeNull();
  });
});

describe("SignInForm - form interaction", () => {
  test("updates email input on change", async () => {
    render(<SignInForm />);

    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.type(emailInput, "test@example.com");

    expect((emailInput as HTMLInputElement).value).toBe("test@example.com");
  });

  test("updates password input on change", async () => {
    render(<SignInForm />);

    const passwordInput = screen.getByLabelText(/password/i);
    await userEvent.type(passwordInput, "mypassword");

    expect((passwordInput as HTMLInputElement).value).toBe("mypassword");
  });

  test("calls signIn with email and password on submit", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    render(<SignInForm />);

    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form")!);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("user@example.com", "secret123");
    });
  });

  test("calls onSuccess callback after successful sign in", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    const onSuccess = vi.fn();
    render(<SignInForm onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "pass");
    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form")!);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  test("does not call onSuccess when sign in fails", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });
    const onSuccess = vi.fn();
    render(<SignInForm onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText(/email/i), "bad@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form")!);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe("SignInForm - error handling", () => {
  test("shows error message on sign in failure", async () => {
    mockSignIn.mockResolvedValue({
      success: false,
      error: "Invalid credentials",
    });
    render(<SignInForm />);

    await userEvent.type(screen.getByLabelText(/email/i), "bad@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeDefined();
    });
  });

  test("shows fallback error when no error message provided", async () => {
    mockSignIn.mockResolvedValue({ success: false });
    render(<SignInForm />);

    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/failed to sign in/i)).toBeDefined();
    });
  });

  test("clears error on new submission", async () => {
    mockSignIn
      .mockResolvedValueOnce({ success: false, error: "Bad credentials" })
      .mockResolvedValueOnce({ success: true });
    render(<SignInForm />);

    const form = screen.getByRole("button", { name: /sign in/i }).closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Bad credentials")).toBeDefined();
    });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.queryByText("Bad credentials")).toBeNull();
    });
  });
});

describe("SignInForm - loading state", () => {
  test("disables inputs when isLoading is true", () => {
    mockIsLoading = true;
    render(<SignInForm />);

    expect((screen.getByLabelText(/email/i) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(/password/i) as HTMLInputElement).disabled).toBe(true);
  });

  test("disables submit button when isLoading is true", () => {
    mockIsLoading = true;
    render(<SignInForm />);

    expect((screen.getByRole("button", { name: /signing in/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  test("shows 'Signing in...' text while loading", () => {
    mockIsLoading = true;
    render(<SignInForm />);

    expect(screen.getByText(/signing in/i)).toBeDefined();
  });

  test("shows 'Sign In' text when not loading", () => {
    render(<SignInForm />);

    expect(screen.getByRole("button", { name: "Sign In" })).toBeDefined();
  });
});
