<?php

class MongoCollection
{
    private $manager;
    private $legacyCollection;
    private $namespace;
    private $database;
    private $collection;
    private $mode;

    public function __construct($manager, $database, $collection)
    {
        $this->manager = $manager;
        $this->database = $database;
        $this->collection = $collection;

        if (class_exists('MongoDB\\Driver\\Manager') && is_a($manager, 'MongoDB\\Driver\\Manager')) {
            $this->mode = 'modern';
            $this->namespace = $database . '.' . $collection;
            return;
        }

        if (is_object($manager) && method_exists($manager, 'selectDB')) {
            $this->mode = 'legacy';
            $this->legacyCollection = $manager->selectDB($database)->selectCollection($collection);
            return;
        }

        throw new Exception('Unsupported MongoDB client');
    }

    public function find($filter = array(), $options = array())
    {
        if ($this->mode === 'legacy') {
            $items = array();
            $cursor = $this->legacyCollection->find($filter);
            foreach ($cursor as $document) {
                $items[] = mongoDocumentToArray($document);
            }

            if (isset($options['sort']['updatedAt']) && $options['sort']['updatedAt'] === -1) {
                usort($items, function ($a, $b) {
                    return strcmp(arr($b, 'updatedAt'), arr($a, 'updatedAt'));
                });
            }

            return $items;
        }

        $cursor = $this->manager->executeQuery($this->namespace, new MongoDB\Driver\Query($filter, $options));
        $items = array();

        foreach ($cursor as $document) {
            $items[] = mongoDocumentToArray($document);
        }

        return $items;
    }

    public function findOne($filter)
    {
        $items = $this->find($filter, array('limit' => 1));
        return count($items) ? $items[0] : null;
    }

    public function countDocuments($filter = array())
    {
        return count($this->find($filter));
    }

    public function insertOne($document)
    {
        if ($this->mode === 'legacy') {
            $this->legacyCollection->insert($document);
            return;
        }

        $bulk = new MongoDB\Driver\BulkWrite();
        $bulk->insert($document);
        $this->manager->executeBulkWrite($this->namespace, $bulk);
    }

    public function insertMany($documents)
    {
        foreach ($documents as $document) {
            $this->insertOne($document);
        }
    }

    public function updateOne($filter, $update)
    {
        if ($this->mode === 'legacy') {
            $this->legacyCollection->update($filter, $update);
            return;
        }

        $bulk = new MongoDB\Driver\BulkWrite();
        $bulk->update($filter, $update);
        $this->manager->executeBulkWrite($this->namespace, $bulk);
    }

    public function updateMany($filter, $update)
    {
        $this->updateOne($filter, $update);
    }

    public function deleteOne($filter)
    {
        if ($this->mode === 'legacy') {
            $result = $this->legacyCollection->remove($filter, array('justOne' => true));
            return isset($result['n']) ? (int) $result['n'] : 0;
        }

        $bulk = new MongoDB\Driver\BulkWrite();
        $bulk->delete($filter, array('limit' => 1));
        $result = $this->manager->executeBulkWrite($this->namespace, $bulk);
        return $result->getDeletedCount();
    }
}

function createMongoClient($uri)
{
    if (class_exists('MongoDB\\Driver\\Manager')) {
        return new MongoDB\Driver\Manager($uri);
    }

    if (class_exists('MongoClient')) {
        return new MongoClient($uri);
    }

    return null;
}

function databaseNameFromUri($uri)
{
    $path = parse_url($uri, PHP_URL_PATH);
    $name = trim((string) $path, '/');
    if ($name === '') {
        return 'novatech';
    }

    $parts = explode('/', $name);
    return $parts[0];
}
