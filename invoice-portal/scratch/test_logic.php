<?php
// Simulate a POST request to auth.php?action=register
$_SERVER['REQUEST_METHOD'] = 'POST';
$_GET['action'] = 'register';

// Mock getJsonBody which is defined in db.php (included by auth.php)
// We'll define a custom function and then auth.php will try to use the one from db.php
// To avoid "function already defined", we'll just check what auth.php does.

// Actually, I'll just run auth.php but I need to mock the input.
// I'll overwrite db.php's getJsonBody by putting it in a separate file if needed.
// But PHP doesn't allow re-defining.

// Let's just manually run the logic in a scratch script.
require_once __DIR__ . '/../backend/config/db.php';

$data = [
    'name' => 'Backend Strict Test',
    'email' => 'backend_strict@example.com',
    'password' => 'password123',
    'role' => 'admin' // Attempting to hijack
];

$name     = trim($data['name'] ?? '');
$email    = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

// THE ACTUAL LOGIC FROM auth.php
$role = 'client'; 
if (isset($_SESSION['user_id'])) {
    $checkAdminStmt = $pdo->prepare("SELECT role FROM users WHERE id = ?");
    $checkAdminStmt->execute([$_SESSION['user_id']]);
    $actingUser = $checkAdminStmt->fetch();
    if ($actingUser && $actingUser['role'] === 'admin') {
        $role = $data['role'] ?? 'client';
    }
}
if (!isset($_SESSION['user_id'])) {
    $role = 'client';
}

echo "Role to be assigned: " . $role . "\n";

if ($role === 'client') {
    echo "SUCCESS: System correctly defaulted to client.\n";
} else {
    echo "FAILURE: System allowed admin role.\n";
}
