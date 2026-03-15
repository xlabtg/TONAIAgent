<?php
/**
 * TON AI Agent - API Configuration Example
 *
 * Copy this file to config.php and update the values for your deployment.
 *
 * IMPORTANT: Never commit config.php to version control!
 */

return [
    // Email Settings
    'email' => [
        'admin_email' => 'admin@yourdomain.com',
        'from_email' => 'noreply@yourdomain.com',
        'from_name' => 'TON AI Agent',
        'smtp_enabled' => false, // Set to true to use SMTP instead of PHP mail()
        'smtp_host' => 'smtp.yourdomain.com',
        'smtp_port' => 587,
        'smtp_user' => '',
        'smtp_pass' => '',
        'smtp_encryption' => 'tls', // 'tls' or 'ssl'
    ],

    // reCAPTCHA Settings (recommended for production)
    'recaptcha' => [
        'enabled' => false,
        'site_key' => '', // Public key for frontend
        'secret_key' => '', // Secret key for backend verification
    ],

    // HubSpot CRM Integration
    'hubspot' => [
        'enabled' => false,
        'api_key' => '',
        'portal_id' => '',
        'newsletter_list_id' => '',
    ],

    // Logging
    'logging' => [
        'enabled' => true,
        'log_dir' => __DIR__ . '/../logs/',
        'log_level' => 'info', // 'debug', 'info', 'warning', 'error'
    ],

    // Security
    'security' => [
        'rate_limit_enabled' => true,
        'rate_limit_requests' => 10, // Max requests
        'rate_limit_window' => 60, // Per seconds
        'honeypot_field' => 'website', // Hidden field name for bot detection
    ],

    // Analytics
    'analytics' => [
        'posthog_enabled' => false,
        'posthog_key' => '',
        'google_analytics_id' => '',
    ],
];
