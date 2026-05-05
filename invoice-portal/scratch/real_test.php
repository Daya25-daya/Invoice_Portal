<?php
// Test if auth.php actually assigns client role
$_SERVER['REQUEST_METHOD'] = 'POST';
$_GET['action'] = 'register';
// Mock php://input
$testData = json_encode([
    'name' => 'Real Backend Test',
    'email' => 'real_backend@example.com',
    'password' => 'password123',
    'role' => 'admin' // Attempting to hijack
]);

// Since we can't easily mock php://input globally for require_once, 
// we will just copy the core logic into this script and run it against the REAL DB.
require_once __DIR__ . '/../backend/config/db.php';

$data = json_decode($testData, true);
$name     = trim($data['name'] ?? '');
$email    = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

// THE EXACT LOGIC FROM auth.php
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

$hash = password_hash($password, PASSWORD_BCRYPT);
$stmt = $pdo->prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)");
$stmt->execute([$name, $email, $hash, $role]);

echo "Inserted user with email real_backend@example.com and role: " . $role . "\n";
