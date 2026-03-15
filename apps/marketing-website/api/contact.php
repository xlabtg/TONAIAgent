<?php
/**
 * TON AI Agent - Contact Form Handler
 *
 * This PHP script handles contact form submissions.
 * Configure your email settings below before deploying.
 */

// Configuration
$config = [
    'admin_email' => 'contact@tonaiagent.com',
    'from_email' => 'noreply@tonaiagent.com',
    'from_name' => 'TON AI Agent Contact Form',
    'success_redirect' => '../company/contact.html?sent=1',
    'error_redirect' => '../company/contact.html?error=1',
    'enable_file_logging' => true,
    'log_file' => '../logs/contact.log',
    'enable_recaptcha' => false,
    'recaptcha_secret' => '',
    'max_message_length' => 5000,
];

// Security headers
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get and validate input
$name = trim(filter_input(INPUT_POST, 'name', FILTER_SANITIZE_STRING) ?? '');
$email = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);
$subject = trim(filter_input(INPUT_POST, 'subject', FILTER_SANITIZE_STRING) ?? '');
$message = trim(filter_input(INPUT_POST, 'message', FILTER_SANITIZE_STRING) ?? '');
$type = filter_input(INPUT_POST, 'type', FILTER_SANITIZE_STRING) ?? 'general';

// Validation
$errors = [];

if (empty($name) || strlen($name) < 2) {
    $errors[] = 'Please provide a valid name';
}

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Please provide a valid email address';
}

if (empty($message) || strlen($message) < 10) {
    $errors[] = 'Please provide a message (minimum 10 characters)';
}

if (strlen($message) > $config['max_message_length']) {
    $errors[] = 'Message is too long (maximum ' . $config['max_message_length'] . ' characters)';
}

// Honeypot check (anti-spam)
if (!empty($_POST['website'])) {
    // Bot detected - silently fail
    sleep(2);
    echo json_encode(['success' => true]);
    exit;
}

if (!empty($errors)) {
    http_response_code(400);
    if (isset($_POST['ajax'])) {
        echo json_encode(['success' => false, 'errors' => $errors]);
    } else {
        header('Location: ' . $config['error_redirect']);
    }
    exit;
}

// reCAPTCHA verification
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

// Log contact submission
if ($config['enable_file_logging']) {
    $log_dir = dirname($config['log_file']);
    if (!is_dir($log_dir)) {
        mkdir($log_dir, 0755, true);
    }

    $log_entry = sprintf(
        "[%s] Contact form: %s <%s> - %s (Type: %s)\n",
        date('Y-m-d H:i:s'),
        $name,
        $email,
        substr($subject ?: 'No subject', 0, 50),
        $type
    );

    file_put_contents($config['log_file'], $log_entry, FILE_APPEND | LOCK_EX);
}

// Determine recipient based on type
$recipients = [
    'general' => $config['admin_email'],
    'support' => 'support@tonaiagent.com',
    'sales' => 'sales@tonaiagent.com',
    'press' => 'press@tonaiagent.com',
    'partnerships' => 'partnerships@tonaiagent.com',
];
$recipient = $recipients[$type] ?? $config['admin_email'];

// Build email
$email_subject = '[TON AI Agent] ' . ($subject ?: 'Contact Form: ' . ucfirst($type));

$email_body = "New contact form submission from TON AI Agent website:\n\n";
$email_body .= "----------------------------------------\n";
$email_body .= "Name: {$name}\n";
$email_body .= "Email: {$email}\n";
$email_body .= "Type: " . ucfirst($type) . "\n";
$email_body .= "Subject: " . ($subject ?: 'N/A') . "\n";
$email_body .= "Date: " . date('Y-m-d H:i:s T') . "\n";
$email_body .= "IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . "\n";
$email_body .= "----------------------------------------\n\n";
$email_body .= "Message:\n\n{$message}\n";

$headers = [
    'From: ' . $config['from_name'] . ' <' . $config['from_email'] . '>',
    'Reply-To: ' . $name . ' <' . $email . '>',
    'X-Mailer: PHP/' . phpversion(),
    'Content-Type: text/plain; charset=UTF-8'
];

$mail_sent = @mail($recipient, $email_subject, $email_body, implode("\r\n", $headers));

// Send auto-reply to user
$auto_reply_subject = 'Thank you for contacting TON AI Agent';
$auto_reply_body = "Dear {$name},\n\n";
$auto_reply_body .= "Thank you for reaching out to TON AI Agent. We have received your message and will get back to you as soon as possible.\n\n";
$auto_reply_body .= "For your reference, here's a copy of your message:\n";
$auto_reply_body .= "----------------------------------------\n";
$auto_reply_body .= $message . "\n";
$auto_reply_body .= "----------------------------------------\n\n";
$auto_reply_body .= "Best regards,\n";
$auto_reply_body .= "The TON AI Agent Team\n\n";
$auto_reply_body .= "---\n";
$auto_reply_body .= "Website: https://tonaiagent.com\n";
$auto_reply_body .= "Telegram: https://t.me/tonaiagent\n";

$auto_reply_headers = [
    'From: TON AI Agent <' . $config['from_email'] . '>',
    'Content-Type: text/plain; charset=UTF-8'
];

@mail($email, $auto_reply_subject, $auto_reply_body, implode("\r\n", $auto_reply_headers));

// Send response
if (isset($_POST['ajax'])) {
    echo json_encode([
        'success' => true,
        'message' => 'Your message has been sent successfully. We will get back to you soon!'
    ]);
} else {
    header('Location: ' . $config['success_redirect']);
}
