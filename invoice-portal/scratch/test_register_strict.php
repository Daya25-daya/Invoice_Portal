<?php
// Simulate a POST request to auth.php?action=register
$_SERVER['REQUEST_METHOD'] = 'POST';
$_GET['action'] = 'register';

// Mock input stream
function getJsonBody() {
    return [
        'name' => 'Backend Strict Test',
        'email' => 'backend_strict@example.com',
        'password' => 'password123',
        'role' => 'admin' // Attempting to hijack
    ];
}

// We need to redefine requireAuth or mock session
session_start();
session_unset(); // Ensure NO session

require_once __DIR__ . '/backend/api/auth.php';
