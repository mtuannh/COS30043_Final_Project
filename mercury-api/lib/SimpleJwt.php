<?php

function jwtEncode($payload, $secret)
{
    $header = base64UrlEncode(json_encode(array('typ' => 'JWT', 'alg' => 'HS256')));
    $body = base64UrlEncode(json_encode($payload));
    $signature = base64UrlEncode(hash_hmac('sha256', $header . '.' . $body, $secret, true));
    return $header . '.' . $body . '.' . $signature;
}

function jwtDecode($token, $secret)
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        throw new Exception('Invalid token');
    }

    $header = $parts[0];
    $body = $parts[1];
    $signature = $parts[2];
    $expected = base64UrlEncode(hash_hmac('sha256', $header . '.' . $body, $secret, true));

    if ($expected !== $signature) {
        throw new Exception('Invalid token signature');
    }

    $payload = json_decode(base64UrlDecode($body), true);
    if (!is_array($payload)) {
        throw new Exception('Invalid token payload');
    }

    if (isset($payload['exp']) && time() >= (int) $payload['exp']) {
        throw new Exception('Token expired');
    }

    return $payload;
}

function base64UrlEncode($value)
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function base64UrlDecode($value)
{
    $remainder = strlen($value) % 4;
    if ($remainder) {
        $value .= str_repeat('=', 4 - $remainder);
    }

    return base64_decode(strtr($value, '-_', '+/'));
}
