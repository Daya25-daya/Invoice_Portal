USE invoice_portal;
DELETE FROM users WHERE name = 'Daya' OR email = 'daya@example.com';
INSERT INTO users (name, email, password, role) VALUES ('Daya', 'daya@example.com', '$2y$10$4/Wui4AQxbTBDgz8ttkyOehzD81DuchvQXpfUPoYYEFihNSWlYBAi', 'admin');
