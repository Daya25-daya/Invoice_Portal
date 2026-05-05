<?php
// Store sensitive keys here
define('STRIPE_PUBLISHABLE_KEY', 'your_stripe_publishable_key_here');
define('STRIPE_SECRET_KEY', 'your_stripe_secret_key_here');

// Frontend URL for redirection
define('FRONTEND_URL', 'http://localhost:5173');

// Email Configuration (SMTP)
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USER', 'your_email@gmail.com');
define('SMTP_PASS', 'your_app_password_here');
define('FROM_EMAIL', 'billing@invoiceflow.com');
define('FROM_NAME', 'InvoiceFlow Billing');
