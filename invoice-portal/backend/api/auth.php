<?php
/**
 * Auth API
 * 
 * GET  ?action=me       → current user
 * POST ?action=register → register new user
 * POST ?action=login    → log in
 * POST ?action=logout   → log out
 */

require_once __DIR__ . '/../config/db.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'register':
        handleRegister();
        break;
    case 'login':
        handleLogin();
        break;
    case 'logout':
        handleLogout();
        break;
    case 'me':
        handleMe();
        break;
    default:
        jsonResponse(['error' => 'Invalid auth action'], 400);
}

// ─── Handlers ────────────────────────────────

function handleRegister(): void {
    global $pdo;
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }

    $data = getJsonBody();
    $name     = trim($data['name'] ?? '');
    $email    = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';
    // Role Logic: Default is ALWAYS client
    $role = 'client';

    // Only if an ADMIN is logged in can they specify a role
    if (isset($_SESSION['user_id'])) {
        $checkAdminStmt = $pdo->prepare("SELECT role FROM users WHERE id = ?");
        $checkAdminStmt->execute([$_SESSION['user_id']]);
        $actingUser = $checkAdminStmt->fetch();
        
        if ($actingUser && $actingUser['role'] === 'admin') {
            $role = $data['role'] ?? 'client';
        }
    }
    
    // Final safety: even if data was passed, if not admin session, it's a client
    if (!isset($_SESSION['user_id'])) {
        $role = 'client';
    }

    // Validation
    if (empty($name) || empty($email) || empty($password)) {
        jsonResponse(['error' => 'Name, email, and password are required.'], 422);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['error' => 'Invalid email address.'], 422);
    }
    if (strlen($password) < 6) {
        jsonResponse(['error' => 'Password must be at least 6 characters.'], 422);
    }

    // Check if email exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'Email is already registered.'], 409);
    }

    // Insert user
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)");
    $stmt->execute([$name, $email, $hash, $role]);

    $userId = (int) $pdo->lastInsertId();
    $_SESSION['user_id'] = $userId;

    if ($role === 'client') {
        // Link any existing client records with this email to this new user account
        $stmt = $pdo->prepare("UPDATE clients SET client_user_id = ? WHERE email = ?");
        $stmt->execute([$userId, $email]);
    }

    jsonResponse([
        'message' => 'Registration successful.',
        'user' => ['id' => $userId, 'name' => $name, 'email' => $email, 'role' => $role]
    ], 201);
}

function handleLogin(): void {
    global $pdo;
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }

    $data = getJsonBody();
    $email    = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    if (empty($email) || empty($password)) {
        jsonResponse(['error' => 'Email and password are required.'], 422);
    }

    $stmt = $pdo->prepare("SELECT id, name, email, password, role FROM users WHERE email = :email OR name = :name");
    $stmt->execute(['email' => $email, 'name' => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        jsonResponse(['error' => 'Invalid email or password.'], 401);
    }

    $_SESSION['user_id'] = (int) $user['id'];

    jsonResponse([
        'message' => 'Login successful.',
        'user' => [
            'id'    => (int) $user['id'],
            'name'  => $user['name'],
            'email' => $user['email'],
            'role'  => $user['role']
        ]
    ]);
}

function handleLogout(): void {
    session_unset();
    session_destroy();
    jsonResponse(['message' => 'Logged out successfully.']);
}

function handleMe(): void {
    global $pdo;
    $userId = requireAuth();

    $stmt = $pdo->prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(['error' => 'User not found.'], 404);
    }

    jsonResponse(['user' => $user]);
}
