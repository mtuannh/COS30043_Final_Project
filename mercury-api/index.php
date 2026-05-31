<?php

require __DIR__ . '/bootstrap.php';

fixAuthorizationHeader();

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if (requestMethod() === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = requestMethod();
$path = requestPath();
$body = readJsonBody();

try {
    if ($method === 'GET' && $path === '/api/ping') {
        jsonResponse(array(
            'ok' => true,
            'php' => PHP_VERSION,
            'storage' => isset($apiStorage) ? $apiStorage : 'unknown',
            'mongodb_ext' => extension_loaded('mongodb'),
            'mongo_ext' => extension_loaded('mongo')
        ));
    }

    if ($method === 'GET' && $path === '/api/products') {
        $query = strtolower((string) arr($_GET, 'query'));
        $category = (string) arr($_GET, 'category');
        $sort = (string) arr($_GET, 'sort', 'featured');
        $page = max(1, (int) arr($_GET, 'page', 1));
        $limit = max(1, (int) arr($_GET, 'limit', 6));

        $items = $products->find();

        if ($query !== '') {
            $filtered = array();
            foreach ($items as $product) {
                $haystack = strtolower(implode(' ', array(
                    arr($product, 'name'),
                    arr($product, 'category'),
                    arr($product, 'summary'),
                    arr($product, 'description')
                )));
                if (strpos($haystack, $query) !== false) {
                    $filtered[] = $product;
                }
            }
            $items = $filtered;
        }

        if ($category !== '') {
            $filtered = array();
            foreach ($items as $product) {
                if (arr($product, 'category') === $category) {
                    $filtered[] = $product;
                }
            }
            $items = $filtered;
        }

        if ($sort === 'price-asc') {
            usort($items, function ($a, $b) {
                return arr($a, 'price', 0) - arr($b, 'price', 0);
            });
        }
        if ($sort === 'price-desc') {
            usort($items, function ($a, $b) {
                return arr($b, 'price', 0) - arr($a, 'price', 0);
            });
        }
        if ($sort === 'likes-desc') {
            usort($items, function ($a, $b) {
                return arr($b, 'likes', 0) - arr($a, 'likes', 0);
            });
        }

        $total = count($items);
        $start = ($page - 1) * $limit;
        jsonResponse(array(
            'items' => array_slice($items, $start, $limit),
            'total' => $total,
            'page' => $page,
            'limit' => $limit
        ));
    }

    if ($method === 'GET' && preg_match('#^/api/products/([^/]+)$#', $path, $m)) {
        $product = $products->findOne(array('id' => $m[1]));
        if (!$product) {
            jsonResponse(array('message' => 'Product not found'), 404);
        }
        jsonResponse($product);
    }

    if ($method === 'POST' && $path === '/api/products') {
        requireAdmin($config);
        $product = array_merge(array('id' => uuid(), 'likes' => 0), $body);
        $products->insertOne($product);
        jsonResponse($product, 201);
    }

    if ($method === 'PUT' && preg_match('#^/api/products/([^/]+)$#', $path, $m)) {
        requireAdmin($config);
        $products->updateOne(array('id' => $m[1]), array('$set' => $body));
        $product = $products->findOne(array('id' => $m[1]));
        if (!$product) {
            jsonResponse(array('message' => 'Product not found'), 404);
        }
        jsonResponse($product);
    }

    if ($method === 'DELETE' && preg_match('#^/api/products/([^/]+)$#', $path, $m)) {
        requireAdmin($config);
        $result = $products->deleteOne(array('id' => $m[1]));
        if ($result === 0) {
            jsonResponse(array('message' => 'Product not found'), 404);
        }
        jsonResponse(array('ok' => true));
    }

    if ($method === 'POST' && preg_match('#^/api/products/([^/]+)/like$#', $path, $m)) {
        $products->updateOne(array('id' => $m[1]), array('$inc' => array('likes' => 1)));
        $product = $products->findOne(array('id' => $m[1]));
        if (!$product) {
            jsonResponse(array('message' => 'Product not found'), 404);
        }
        jsonResponse($product);
    }

    if ($method === 'POST' && $path === '/api/auth/login') {
        $email = normalizeEmail((string) arr($body, 'email'));
        $password = (string) arr($body, 'password');
        if ($email === '' || $password === '') {
            jsonResponse(array('message' => 'Invalid email or password'), 401);
        }

        $user = $users->findOne(array('email' => $email));
        $hash = arr($user, 'password');
        if (!$user || !verifyPassword($password, $hash)) {
            jsonResponse(array('message' => 'Invalid email or password'), 401);
        }
        jsonResponse(authResponse($user, $config));
    }

    if ($method === 'POST' && $path === '/api/auth/register') {
        $name = trim((string) arr($body, 'name'));
        $email = normalizeEmail((string) arr($body, 'email'));
        $password = (string) arr($body, 'password');

        if ($name === '' || !isValidEmail($email) || strlen($password) < 6) {
            jsonResponse(array('message' => 'Name, valid email, and password of at least 6 characters are required'), 400);
        }
        if ($users->findOne(array('email' => $email))) {
            jsonResponse(array('message' => 'Email is already registered'), 409);
        }

        $user = array(
            'id' => uuid(),
            'name' => $name,
            'email' => $email,
            'password' => hashPassword($password),
            'role' => 'admin'
        );
        $users->insertOne($user);
        jsonResponse(authResponse($user, $config), 201);
    }

    if ($method === 'POST' && $path === '/api/admin/create-admin') {
        requireAdmin($config);
        $name = trim((string) arr($body, 'name'));
        $email = normalizeEmail((string) arr($body, 'email'));
        $password = (string) arr($body, 'password');

        if ($name === '' || !isValidEmail($email) || strlen($password) < 6) {
            jsonResponse(array('message' => 'Name, valid email, and password of at least 6 characters are required'), 400);
        }
        if ($users->findOne(array('email' => $email))) {
            jsonResponse(array('message' => 'Email is already registered'), 409);
        }

        $user = array(
            'id' => uuid(),
            'name' => $name,
            'email' => $email,
            'password' => hashPassword($password),
            'role' => 'admin'
        );
        $users->insertOne($user);
        jsonResponse(withoutPassword($user), 201);
    }

    if ($method === 'POST' && $path === '/api/messages') {
        $message = array_merge(array(
            'id' => uuid(),
            'createdAt' => date('c')
        ), $body);
        $messages->insertOne($message);
        jsonResponse($message, 201);
    }

    if ($method === 'POST' && $path === '/api/discounts/spin') {
        $picked = pickDiscountSegment();
        $segment = $picked['segment'];
        $index = $picked['index'];
        $spinId = uuid();
        $discountSpins->insertOne(array(
            'id' => $spinId,
            'segmentIndex' => $index,
            'discountLabel' => $segment['label'],
            'discountPercent' => $segment['percent'],
            'createdAt' => date('c'),
            'expiresAt' => date('c', time() + 15 * 60),
            'claimed' => false
        ));
        $segments = getDiscountSegments();
        $sectionAngle = 360 / count($segments);
        $stopAngle = 360 - ($index * $sectionAngle + $sectionAngle / 2);
        jsonResponse(array(
            'spinId' => $spinId,
            'segmentIndex' => $index,
            'discountLabel' => $segment['label'],
            'discountPercent' => $segment['percent'],
            'stopAngle' => $stopAngle
        ), 201);
    }

    if ($method === 'POST' && $path === '/api/discounts/claim') {
        $email = normalizeEmail((string) arr($body, 'email'));
        $spinId = (string) arr($body, 'spinId');

        if ($spinId === '') {
            jsonResponse(array('message' => 'Missing spin ID'), 400);
        }
        if (!isValidEmail($email)) {
            jsonResponse(array('message' => 'Please provide a valid email address'), 400);
        }

        $spinRecord = $discountSpins->findOne(array('id' => $spinId));
        if (!$spinRecord) {
            jsonResponse(array('message' => 'Spin not found. Please spin again.'), 404);
        }

        if (!empty($spinRecord['claimed'])) {
            jsonResponse(array('message' => 'This spin has already been used.'), 409);
        }
        if (strtotime((string) arr($spinRecord, 'expiresAt')) < time()) {
            jsonResponse(array('message' => 'This spin has expired. Please spin again.'), 410);
        }

        $code = buildDiscountCode(array(
            'label' => arr($spinRecord, 'discountLabel'),
            'percent' => arr($spinRecord, 'discountPercent', 0)
        ));

        try {
            sendDiscountEmail($config, $email, $code, array(
                'label' => arr($spinRecord, 'discountLabel'),
                'percent' => arr($spinRecord, 'discountPercent', 0)
            ));
        } catch (Exception $e) {
            jsonResponse(array('message' => 'Unable to send discount email right now. Please try again.'), 502);
        }

        $discountSpins->updateOne(
            array('id' => $spinId),
            array('$set' => array(
                'claimed' => true,
                'claimedAt' => date('c'),
                'email' => $email,
                'code' => $code
            ))
        );

        jsonResponse(array(
            'ok' => true,
            'message' => 'Discount code sent',
            'discountLabel' => arr($spinRecord, 'discountLabel')
        ), 201);
    }

    if ($method === 'POST' && $path === '/api/chat') {
        $customerName = trim((string) arr($body, 'customerName'));
        $customerPhone = trim((string) arr($body, 'customerPhone'));
        if ($customerName === '' || $customerPhone === '') {
            jsonResponse(array('message' => 'customerName and customerPhone are required'), 400);
        }
        $conversation = array(
            'id' => uuid(),
            'customerName' => $customerName,
            'customerPhone' => $customerPhone,
            'createdAt' => date('c'),
            'updatedAt' => date('c'),
            'messages' => array()
        );
        $chat->insertOne($conversation);
        jsonResponse($conversation, 201);
    }

    if ($method === 'POST' && preg_match('#^/api/chat/([^/]+)/messages$#', $path, $m)) {
        $sender = (string) arr($body, 'sender');
        $text = (string) arr($body, 'text');
        if ($sender === '' || $text === '') {
            jsonResponse(array('message' => 'sender and text are required'), 400);
        }
        $msg = array(
            'sender' => $sender,
            'text' => $text,
            'time' => arr($body, 'time', date('h:i A')),
            'timestamp' => date('c')
        );
        $chat->updateOne(
            array('id' => $m[1]),
            array(
                '$push' => array('messages' => $msg),
                '$set' => array('updatedAt' => date('c'))
            )
        );
        $conversation = $chat->findOne(array('id' => $m[1]));
        if (!$conversation) {
            jsonResponse(array('message' => 'Conversation not found'), 404);
        }
        jsonResponse($conversation);
    }

    if ($method === 'GET' && preg_match('#^/api/chat/([^/]+)$#', $path, $m)) {
        $conversation = $chat->findOne(array('id' => $m[1]));
        if (!$conversation) {
            jsonResponse(array('message' => 'Conversation not found'), 404);
        }
        jsonResponse($conversation);
    }

    if ($method === 'GET' && $path === '/api/chat') {
        requireAdmin($config);
        jsonResponse($chat->find(array(), array('sort' => array('updatedAt' => -1))));
    }

    if ($method === 'DELETE' && preg_match('#^/api/chat/([^/]+)$#', $path, $m)) {
        requireAdmin($config);
        $result = $chat->deleteOne(array('id' => $m[1]));
        if ($result === 0) {
            jsonResponse(array('message' => 'Conversation not found'), 404);
        }
        jsonResponse(array('ok' => true));
    }

    if ($method === 'POST' && preg_match('#^/api/chat/([^/]+)/reply$#', $path, $m)) {
        requireAdmin($config);
        $text = trim((string) arr($body, 'text'));
        if ($text === '') {
            jsonResponse(array('message' => 'text is required'), 400);
        }
        $msg = array(
            'sender' => 'admin',
            'text' => $text,
            'time' => date('h:i A'),
            'timestamp' => date('c')
        );
        $chat->updateOne(
            array('id' => $m[1]),
            array(
                '$push' => array('messages' => $msg),
                '$set' => array('updatedAt' => date('c'))
            )
        );
        $conversation = $chat->findOne(array('id' => $m[1]));
        if (!$conversation) {
            jsonResponse(array('message' => 'Conversation not found'), 404);
        }
        jsonResponse($conversation);
    }

    jsonResponse(array('message' => 'API route not found', 'path' => $path), 404);
} catch (Exception $e) {
    jsonResponse(array('message' => 'Server error: ' . $e->getMessage()), 500);
}
