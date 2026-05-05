<?php
require_once __DIR__ . '/config/db.php';

try {
    $db = getDB();
    $name = 'Daya';
    $password = 'Daya@_25';
    $email = 'daya@example.com';
    $role = 'admin';
    
    // Hash password
    $hash = password_hash($password, PASSWORD_DEFAULT);
    
    // Check if user exists
    $stmt = $db->prepare("SELECT id FROM users WHERE name = ?");
    $stmt->execute([$name]);
    $user = $stmt->fetch();
    
    if ($user) {
        // Update existing user
        $stmt = $db->prepare("UPDATE users SET password = ?, role = ?, email = ? WHERE id = ?");
        $stmt->execute([$hash, $role, $email, $user['id']]);
        echo "Admin user 'Daya' updated successfully.\n";
    } else {
        // Create new user
        $stmt = $db->prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)");
        $stmt->execute([$name, $email, $hash, $role]);
        echo "Admin user 'Daya' created successfully.\n";
    }
    
    // Verify
    $stmt = $db->prepare("SELECT * FROM users WHERE name = ?");
    $stmt->execute([$name]);
    $check = $stmt->fetch();
    echo "Verification - Name: " . $check['name'] . ", Role: " . $check['role'] . "\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
