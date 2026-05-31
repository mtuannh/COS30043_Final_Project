<?php

require __DIR__ . '/lib/helpers.php';
require __DIR__ . '/lib/SimpleJwt.php';
require __DIR__ . '/lib/SmtpMail.php';
require __DIR__ . '/lib/MongoCollection.php';
require __DIR__ . '/lib/JsonFileStore.php';

function loadConfig()
{
    $path = __DIR__ . '/config.php';
    if (!is_file($path)) {
        jsonResponse(array(
            'message' => 'API config missing. Run npm run build again (needs .env in project root).'
        ), 500);
    }

    return require $path;
}

function jsonResponse($payload, $status = 200)
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($payload);
    exit;
}

function readJsonBody()
{
    $raw = file_get_contents('php://input');
    if ($raw === false) {
        $raw = '';
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : array();
}

function requestPath()
{
    if (!empty($_GET['route'])) {
        $route = '/' . trim((string) $_GET['route'], '/');
        if (strpos($route, '/api') !== 0) {
            $route = '/api' . $route;
        }
        return $route;
    }

    $uri = parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/', PHP_URL_PATH);
    if (!$uri) {
        $uri = '/';
    }

    $uri = '/' . trim($uri, '/');

    if (preg_match('#/api(?:/index\.php)?(.*)$#', $uri, $matches)) {
        $suffix = $matches[1] ? $matches[1] : '';
        return '/api' . $suffix;
    }

    return $uri;
}

function fixAuthorizationHeader()
{
    if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
        return;
    }

    if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $_SERVER['HTTP_AUTHORIZATION'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        return;
    }

    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        foreach ($headers as $name => $value) {
            if (strcasecmp($name, 'Authorization') === 0) {
                $_SERVER['HTTP_AUTHORIZATION'] = $value;
                return;
            }
        }
    }
}

function requestMethod()
{
    return strtoupper(isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET');
}

function bearerUser($config)
{
    $header = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        return null;
    }

    try {
        return jwtDecode($matches[1], $config['JWT_SECRET']);
    } catch (Exception $e) {
        return null;
    }
}

function requireAuth($config)
{
    $user = bearerUser($config);
    if (!$user) {
        jsonResponse(array('message' => 'Authentication token is required'), 401);
    }
    return $user;
}

function requireAdmin($config)
{
    $user = requireAuth($config);
    if (arr($user, 'role') !== 'admin') {
        jsonResponse(array('message' => 'Admin access is required'), 403);
    }
    return $user;
}

function normalizeEmail($email)
{
    return strtolower(trim($email));
}

function isValidEmail($email)
{
    return (bool) filter_var($email, FILTER_VALIDATE_EMAIL);
}

function withoutPassword($user)
{
    unset($user['password'], $user['_id']);
    return $user;
}

function isBcryptHash($password)
{
    return (bool) preg_match('/^\$2[aby]\$\d{2}\$/', $password);
}

function jwtExpiry($expiresIn)
{
    if (ctype_digit((string) $expiresIn)) {
        return time() + (int) $expiresIn;
    }

    if (preg_match('/^(\d+)([dhms])$/', $expiresIn, $m)) {
        $value = (int) $m[1];
        $unit = $m[2];
        $map = array('d' => 'days', 'h' => 'hours', 'm' => 'minutes', 's' => 'seconds');
        return strtotime('+' . $value . ' ' . $map[$unit]);
    }

    return strtotime('+7 days');
}

function signToken($user, $config)
{
    return jwtEncode(array(
        'id' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role'],
        'exp' => jwtExpiry((string) arr($config, 'JWT_EXPIRES_IN', '7d'))
    ), $config['JWT_SECRET']);
}

function authResponse($user, $config)
{
    return array(
        'token' => signToken($user, $config),
        'user' => withoutPassword($user)
    );
}

function seedIfEmpty($products, $users, $messages)
{
    if ($products->countDocuments() > 0) {
        return;
    }

    $seedPath = __DIR__ . '/seed.json';
    if (!is_file($seedPath)) {
        return;
    }

    $seed = json_decode(file_get_contents($seedPath), true);
    if (!is_array($seed)) {
        return;
    }

    if (!empty($seed['users'])) {
        $users->insertMany($seed['users']);
    }
    if (!empty($seed['products'])) {
        $products->insertMany($seed['products']);
    }
    if (!empty($seed['messages'])) {
        $messages->insertMany($seed['messages']);
    }
}

function migratePlainTextPasswords($users)
{
    foreach ($users->find() as $user) {
        $password = arr($user, 'password');
        if (!$password || isBcryptHash($password)) {
            continue;
        }
        $users->updateOne(array('id' => $user['id']), array('$set' => array('password' => hashPassword($password))));
    }
}

function sendDiscountEmail($config, $to, $code, $segment)
{
    $discountText = arr($segment, 'label') === 'Free Shipping'
        ? 'free shipping'
        : (arr($segment, 'percent', 0) . '% off');

    sendSmtpMail(
        $config,
        $to,
        'Your NovaTech discount code',
        implode("\n", array(
            'Thanks for spinning the NovaTech reward wheel.',
            'You won ' . $discountText . '.',
            'Your discount code is: ' . $code,
            'Use it before checkout.'
        ))
    );
}

function getDiscountSegments()
{
    return array(
        array('label' => '5% OFF', 'percent' => 5, 'weight' => 30),
        array('label' => '10% OFF', 'percent' => 10, 'weight' => 25),
        array('label' => '15% OFF', 'percent' => 15, 'weight' => 20),
        array('label' => '20% OFF', 'percent' => 20, 'weight' => 12),
        array('label' => 'Free Shipping', 'percent' => 0, 'weight' => 8),
        array('label' => '25% OFF', 'percent' => 25, 'weight' => 5)
    );
}

function pickDiscountSegment()
{
    $segments = getDiscountSegments();
    $totalWeight = 0;
    foreach ($segments as $segment) {
        $totalWeight += $segment['weight'];
    }

    $ticket = randomInt(0, $totalWeight - 1);

    foreach ($segments as $index => $segment) {
        if ($ticket < $segment['weight']) {
            return array('segment' => $segment, 'index' => $index);
        }
        $ticket -= $segment['weight'];
    }

    return array('segment' => $segments[0], 'index' => 0);
}

function buildDiscountCode($segment)
{
    $percent = (int) arr($segment, 'percent', 0);
    $label = (string) arr($segment, 'label', '');
    $prefix = $percent > 0 ? 'NT' . $percent : strtoupper(preg_replace('/\W+/', '', substr($label, 0, 8)));

    if (function_exists('random_bytes')) {
        $suffix = strtoupper(bin2hex(random_bytes(3)));
    } else {
        $suffix = strtoupper(bin2hex(openssl_random_pseudo_bytes(3)));
    }

    return $prefix . '-' . $suffix;
}

$config = loadConfig();
$mongoClient = createMongoClient($config['MONGODB_URI']);
$apiStorage = 'mongodb';

if ($mongoClient) {
    $dbName = databaseNameFromUri($config['MONGODB_URI']);
    $users = new MongoCollection($mongoClient, $dbName, 'users');
    $products = new MongoCollection($mongoClient, $dbName, 'products');
    $messages = new MongoCollection($mongoClient, $dbName, 'messages');
    $discountSpins = new MongoCollection($mongoClient, $dbName, 'discountSpins');
    $chat = new MongoCollection($mongoClient, $dbName, 'chat');
} else {
    $apiStorage = 'json';
    $jsonCollections = createJsonCollections($config);
    $users = $jsonCollections['users'];
    $products = $jsonCollections['products'];
    $messages = $jsonCollections['messages'];
    $discountSpins = $jsonCollections['discountSpins'];
    $chat = $jsonCollections['chat'];
}

seedIfEmpty($products, $users, $messages);
migratePlainTextPasswords($users);
$users->updateMany(array('role' => 'customer'), array('$set' => array('role' => 'admin')));
