console.log("=== Testing Admin Authentication API Endpoints ===");

const BASE_URL = "http://localhost:3001";

async function runTests() {
  // Test 1: Check initial session (should be false)
  console.log("\n1. Checking initial session without cookie...");
  const res1 = await fetch(`${BASE_URL}/api/auth/session`);
  const data1 = await res1.json();
  console.log("Initial session response:", data1);
  if (data1.authenticated !== false) {
    throw new Error("Expected unauthenticated session!");
  }

  // Test 2: Attempt login with incorrect PIN
  console.log("\n2. Testing incorrect PIN rejection...");
  const res2 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: "wrong_pin_123" }),
  });
  const data2 = await res2.json();
  console.log("Status:", res2.status, "Response:", data2);
  if (res2.status !== 401 || data2.success !== false) {
    throw new Error("Expected 401 Unauthorized for incorrect PIN!");
  }

  // Test 3: Attempt login with correct PIN
  console.log("\n3. Testing correct PIN login...");
  const res3 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: "sielab2026" }),
  });
  const data3 = await res3.json();
  const setCookie = res3.headers.get("set-cookie");
  console.log("Status:", res3.status, "Response:", data3);
  console.log("Set-Cookie header:", setCookie ? "Received (HttpOnly)" : "Missing!");
  if (res3.status !== 200 || !data3.success || !setCookie) {
    throw new Error("Expected 200 OK and Set-Cookie for correct PIN!");
  }

  // Extract cookie value for subsequent test
  const cookieMatch = setCookie.match(/sielab_admin_session=([^;]+)/);
  const cookieHeader = cookieMatch ? `sielab_admin_session=${cookieMatch[1]}` : "";

  // Test 4: Check session with valid cookie
  console.log("\n4. Checking session with valid JWT cookie...");
  const res4 = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { Cookie: cookieHeader },
  });
  const data4 = await res4.json();
  console.log("Session response with cookie:", data4);
  if (data4.authenticated !== true) {
    throw new Error("Expected authenticated: true with valid cookie!");
  }

  // Test 5: Test logout endpoint
  console.log("\n5. Testing logout...");
  const res5 = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
  });
  const data5 = await res5.json();
  const logoutCookie = res5.headers.get("set-cookie");
  console.log("Logout response:", data5, "Cleared cookie:", Boolean(logoutCookie));
  if (res5.status !== 200 || !data5.success) {
    throw new Error("Expected successful logout!");
  }

  console.log("\nAll Admin Authentication tests passed successfully!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
