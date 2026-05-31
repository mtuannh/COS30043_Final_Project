<?php

function arr($array, $key, $default = '')
{
    return isset($array[$key]) ? $array[$key] : $default;
}

function uuid()
{
    if (function_exists('random_bytes')) {
        $data = random_bytes(16);
    } else {
        $data = openssl_random_pseudo_bytes(16);
    }

    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function hashPassword($password)
{
    if (function_exists('password_hash')) {
        return password_hash($password, PASSWORD_BCRYPT);
    }

    $salt = '$2y$10$' . substr(strtr(base64_encode(openssl_random_pseudo_bytes(16)), '+', '.'), 0, 22);
    return crypt($password, $salt);
}

function verifyPassword($password, $hash)
{
    if (function_exists('password_verify')) {
        return password_verify($password, $hash);
    }

    return crypt($password, $hash) === $hash;
}

function randomInt($min, $max)
{
    if (function_exists('random_int')) {
        return random_int($min, $max);
    }

    return mt_rand($min, $max);
}

function mongoDocumentToArray($document)
{
    if (is_array($document)) {
        return $document;
    }

    return json_decode(json_encode($document), true);
}
