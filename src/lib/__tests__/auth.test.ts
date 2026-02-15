// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { jwtVerify } from "jose";

const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

beforeEach(() => {
  vi.clearAllMocks();
});

test("createSession sets a cookie with a valid JWT", async () => {
  const { createSession } = await import("@/lib/auth");

  await createSession("user-123", "test@example.com");

  expect(mockCookieStore.set).toHaveBeenCalledOnce();
  const [name, token, options] = mockCookieStore.set.mock.calls[0];

  expect(name).toBe("auth-token");
  expect(typeof token).toBe("string");
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("createSession produces a JWT containing userId and email", async () => {
  const { createSession } = await import("@/lib/auth");

  await createSession("user-456", "hello@example.com");

  const token = mockCookieStore.set.mock.calls[0][1];
  const { payload } = await jwtVerify(token, JWT_SECRET);

  expect(payload.userId).toBe("user-456");
  expect(payload.email).toBe("hello@example.com");
});

test("createSession sets expiration to 7 days", async () => {
  const { createSession } = await import("@/lib/auth");

  const before = Date.now();
  await createSession("user-789", "expire@example.com");
  const after = Date.now();

  const options = mockCookieStore.set.mock.calls[0][2];
  const expires = new Date(options.expires).getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  expect(expires).toBeGreaterThanOrEqual(before + sevenDays - 1000);
  expect(expires).toBeLessThanOrEqual(after + sevenDays + 1000);
});

test("getSession returns payload from a valid token", async () => {
  const { createSession, getSession } = await import("@/lib/auth");

  await createSession("user-abc", "valid@example.com");
  const token = mockCookieStore.set.mock.calls[0][1];

  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();
  expect(session).not.toBeNull();
  expect(session!.userId).toBe("user-abc");
  expect(session!.email).toBe("valid@example.com");
});

test("getSession returns null when no cookie exists", async () => {
  const { getSession } = await import("@/lib/auth");

  mockCookieStore.get.mockReturnValue(undefined);

  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns null for an invalid token", async () => {
  const { getSession } = await import("@/lib/auth");

  mockCookieStore.get.mockReturnValue({ value: "not-a-valid-jwt" });

  const session = await getSession();
  expect(session).toBeNull();
});

test("deleteSession removes the auth cookie", async () => {
  const { deleteSession } = await import("@/lib/auth");

  await deleteSession();

  expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
});
