<?php

function sendSmtpMail($config, $to, $subject, $body)
{
    $host = arr($config, 'SMTP_HOST');
    $port = (int) arr($config, 'SMTP_PORT', 587);
    $user = arr($config, 'SMTP_USER');
    $pass = arr($config, 'SMTP_PASS');
    $secure = filter_var(arr($config, 'SMTP_SECURE', false), FILTER_VALIDATE_BOOLEAN);
    $from = arr($config, 'DISCOUNT_FROM_EMAIL', $user);

    if (!$host || !$port || !$user || !$pass) {
        throw new Exception('SMTP settings are not configured');
    }

    $fromEmail = $user;
    $fromName = 'NovaTech Store';
    if (preg_match('/^(.+)<(.+)>$/', $from, $matches)) {
        $fromName = trim($matches[1]);
        $fromEmail = trim($matches[2]);
    } elseif (filter_var($from, FILTER_VALIDATE_EMAIL)) {
        $fromEmail = $from;
    }

    $remote = $secure ? 'ssl://' . $host : $host;
    $socket = stream_socket_client($remote . ':' . $port, $errno, $errstr, 20);
    if (!$socket) {
        throw new Exception('SMTP connection failed: ' . $errstr);
    }

    stream_set_timeout($socket, 20);
    expectSmtp($socket, array(220));
    smtpCommand($socket, 'EHLO localhost', array(250));

    if (!$secure) {
        smtpCommand($socket, 'STARTTLS', array(220));
        if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            throw new Exception('SMTP STARTTLS failed');
        }
        smtpCommand($socket, 'EHLO localhost', array(250));
    }

    smtpCommand($socket, 'AUTH LOGIN', array(334));
    smtpCommand($socket, base64_encode($user), array(334));
    smtpCommand($socket, base64_encode($pass), array(235));
    smtpCommand($socket, 'MAIL FROM:<' . $fromEmail . '>', array(250));
    smtpCommand($socket, 'RCPT TO:<' . $to . '>', array(250, 251));
    smtpCommand($socket, 'DATA', array(354));

    $message = implode("\r\n", array(
        'From: ' . $fromName . ' <' . $fromEmail . '>',
        'To: ' . $to,
        'Subject: ' . $subject,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        '',
        $body
    ));

    fwrite($socket, $message . "\r\n.\r\n");
    expectSmtp($socket, array(250));
    smtpCommand($socket, 'QUIT', array(221));
    fclose($socket);
}

function smtpCommand($socket, $command, $okCodes)
{
    fwrite($socket, $command . "\r\n");
    expectSmtp($socket, $okCodes);
}

function expectSmtp($socket, $okCodes)
{
    $response = '';

    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;
        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }

    $code = (int) substr($response, 0, 3);
    if (!in_array($code, $okCodes, true)) {
        throw new Exception('SMTP error: ' . trim($response));
    }
}
