<?php
/**
 * TON AI Agent - Newsletter Subscription Handler
 *
 * This PHP script handles newsletter subscription form submissions.
 * Configure your email settings below before deploying.
 */

// Configuration
$config = [
    'admin_email' => 'newsletter@tonaiagent.com',
    'from_email' => 'noreply@tonaiagent.com',
    'from_name' => 'TON AI Agent',
    'success_redirect' => '../?subscribed=1',
    'error_redirect' => '../?error=subscription',
    'enable_file_logging' => true,
    'log_file' => '../logs/subscriptions.log',
    'enable_recaptcha' => false, // Set to true and add your keys
    'recaptcha_secret' => '',
    // Optional: HubSpot integration
    'hubspot_enabled' => false,
    'hubspot_api_key' => '',
    'hubspot_list_id' => '',
];

// Security headers
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get and validate email
$email = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    if (isset($_POST['ajax'])) {
        echo json_encode(['success' => false, 'error' => 'Invalid email address']);
    } else {
        header('Location: ' . $config['error_redirect']);
    }
    exit;
}

// Optional reCAPTCHA verification
if ($config['enable_recaptcha'] && !empty($config['recaptcha_secret'])) {
    $recaptcha_response = $_POST['g-recaptcha-response'] ?? '';

    $verify_response = file_get_contents(
        'https://www.google.com/recaptcha/api/siteverify?' . http_build_query([
            'secret' => $config['recaptcha_secret'],
            'response' => $recaptcha_response,
            'remoteip' => $_SERVER['REMOTE_ADDR']
        ])
    );

    $verify_result = json_decode($verify_response, true);

    if (!$verify_result['success']) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'reCAPTCHA verification failed']);
        exit;
    }
}

// Log subscription
if ($config['enable_file_logging']) {
    $log_dir = dirname($config['log_file']);
    if (!is_dir($log_dir)) {
        mkdir($log_dir, 0755, true);
    }

    $log_entry = sprintf(
        "[%s] New subscription: %s (IP: %s, UA: %s)\n",
        date('Y-m-d H:i:s'),
        $email,
        $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
    );

    file_put_contents($config['log_file'], $log_entry, FILE_APPEND | LOCK_EX);
}

// Send notification email
$subject = 'New Newsletter Subscription - TON AI Agent';
$message = "New newsletter subscription received:\n\n";
$message .= "Email: {$email}\n";
$message .= "Date: " . date('Y-m-d H:i:s') . "\n";
$message .= "IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . "\n";

$headers = [
    'From: ' . $config['from_name'] . ' <' . $config['from_email'] . '>',
    'Reply-To: ' . $email,
    'X-Mailer: PHP/' . phpversion(),
    'Content-Type: text/plain; charset=UTF-8'
];

$mail_sent = @mail($config['admin_email'], $subject, $message, implode("\r\n", $headers));

// Optional: HubSpot integration
if ($config['hubspot_enabled'] && !empty($config['hubspot_api_key'])) {
    $hubspot_data = json_encode([
        'properties' => [
            'email' => $email,
            'source' => 'Website Newsletter'
        ]
    ]);

    $ch = curl_init('https://api.hubapi.com/crm/v3/objects/contacts');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $hubspot_data,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $config['hubspot_api_key']
        ]
    ]);
    curl_exec($ch);
    curl_close($ch);
}

// Send response
if (isset($_POST['ajax'])) {
    echo json_encode([
        'success' => true,
        'message' => 'Successfully subscribed to the newsletter!'
    ]);
} else {
    header('Location: ' . $config['success_redirect']);
}
