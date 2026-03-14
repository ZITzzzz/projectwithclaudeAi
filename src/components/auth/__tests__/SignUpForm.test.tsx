import { test, expect, vi, beforeEach, afterEach, describe } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignUpForm } from "../SignUpForm";

const mockSignUp = vi.fn();
let mockIsLoading = false;

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    signUp: mockSignUp,
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

describe("SignUpForm - rendering", () => {
  test("renders email, password, and confirm password inputs", () => {
    render(<SignUpForm />);

    expect(screen.getByLabelText(/^email/i)).toBeDefined();
    expect(screen.getByLabelText(/^password/i)).toBeDefined();
    expect(screen.getByLabelText(/confirm password/i)).toBeDefined();
  });

  test("renders sign up button", () => {
    render(<SignUpForm />);

    expect(screen.getByRole("button", { name: /sign up/i })).toBeDefined();
  });

  test("shows password length hint", () => {
    render(<SignUpForm />);

    expect(screen.getByText(/at least 8 characters/i)).toBeDefined();
  });

  test("does not show error message initially", () => {
    render(<SignUpForm />);

    expect(screen.queryByText(/passwords do not match/i)).toBeNull();
  });
});

describe("SignUpForm - password validation", () => {
  test("shows error when passwords do not match", async () => {
    render(<SignUpForm />);

    await userEvent.type(screen.getByLabelText(/^password/i), "password123");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "different");
    fireEvent.submit(screen.getByRole("button", { name: /sign up/i }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeDefined();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  test("does not call signUp when passwords mismatch", async () => {
    render(<SignUpForm />);

    await userEvent.type(screen.getByLabelText(/^password/i), "abc12345");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "xyz99999");
    fireEvent.submit(screen.getByRole("button", { name: /sign up/i }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeDefined();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  test("clears password mismatch error on re-submission with matching passwords", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    render(<SignUpForm />);

    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    const form = screen.getByRole("button", { name: /sign up/i }).closest("form")!;

    await userEvent.type(passwordInput, "pass1234");
    await userEvent.type(confirmInput, "different");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeDefined();
    });

    await userEvent.clear(confirmInput);
    await userEvent.type(confirmInput, "pass1234");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.queryByText("Passwords do not match")).toBeNull();
    });
  });
});

describe("SignUpForm - form submission", () => {
  test("calls signUp with email and password on valid submit", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    render(<SignUpForm />);

    await userEvent.type(screen.getByLabelText(/^email/i), "new@example.com");
    await userEvent.type(screen.getByLabelText(/^password/i), "strongpass");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "strongpass");
    fireEvent.submit(screen.getByRole("button", { name: /sign up/i }).closest("form")!);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith("new@example.com", "strongpass");
    });
  });

  test("calls onSuccess callback after successful sign up", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    const onSuccess = vi.fn();
    render(<SignUpForm onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText(/^email/i), "new@example.com");
    await userEvent.type(screen.getByLabelText(/^password/i), "mypass123");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "mypass123");
    fireEvent.submit(screen.getByRole("button", { name: /sign up/i }).closest("form")!);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  test("does not call onSuccess when sign up fails", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });
    const onSuccess = vi.fn();
    render(<SignUpForm onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText(/^password/i), "pass1234");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "pass1234");
    fireEvent.submit(screen.getByRole("button", { name: /sign up/i }).closest("form")!);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalled();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe("SignUpForm - error handling", () => {
  test("shows error message from server on failure", async () => {
    mockSignUp.mockResolvedValue({
      success: false,
      error: "Email already registered",
    });
    render(<SignUpForm />);

    await userEvent.type(screen.getByLabelText(/^password/i), "pass1234");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "pass1234");
    fireEvent.submit(screen.getByRole("button", { name: /sign up/i }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Email already registered")).toBeDefined();
    });
  });

  test("shows fallback error when no error message provided", async () => {
    mockSignUp.mockResolvedValue({ success: false });
    render(<SignUpForm />);

    await userEvent.type(screen.getByLabelText(/^password/i), "pass1234");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "pass1234");
    fireEvent.submit(screen.getByRole("button", { name: /sign up/i }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/failed to sign up/i)).toBeDefined();
    });
  });
});

describe("SignUpForm - loading state", () => {
  test("disables all inputs when isLoading is true", () => {
    mockIsLoading = true;
    render(<SignUpForm />);

    expect((screen.getByLabelText(/^email/i) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(/^password/i) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(/confirm password/i) as HTMLInputElement).disabled).toBe(true);
  });

  test("shows 'Creating account...' text while loading", () => {
    mockIsLoading = true;
    render(<SignUpForm />);

    expect(screen.getByText(/creating account/i)).toBeDefined();
  });

  test("disables submit button when isLoading is true", () => {
    mockIsLoading = true;
    render(<SignUpForm />);

    const button = screen.getByRole("button", { name: /creating account/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  test("shows 'Sign Up' text when not loading", () => {
    render(<SignUpForm />);

    expect(screen.getByRole("button", { name: "Sign Up" })).toBeDefined();
  });
});
