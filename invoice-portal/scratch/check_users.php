<?php
require_once __DIR__ . '/../backend/config/db.php';
$stmt = $pdo->query("SELECT id, name, email, role FROM users ORDER BY id DESC LIMIT 5");
$users = $stmt->fetchAll();
header('Content-Type: application/json');
echo json_encode($users, JSON_PRETTY_PRINT);
