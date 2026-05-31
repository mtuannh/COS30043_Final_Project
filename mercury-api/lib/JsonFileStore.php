<?php

class JsonFileStore
{
    private $path;
    private $data;

    public function __construct($path)
    {
        $this->path = $path;
        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        if (is_file($path)) {
            $raw = file_get_contents($path);
            $decoded = json_decode($raw, true);
            $this->data = is_array($decoded) ? $decoded : array();
        } else {
            $this->data = array();
        }
    }

    public function getCollection($name)
    {
        if (!isset($this->data[$name]) || !is_array($this->data[$name])) {
            $this->data[$name] = array();
        }

        return new JsonFileCollection($this, $name);
    }

    public function readCollection($name)
    {
        return isset($this->data[$name]) && is_array($this->data[$name])
            ? $this->data[$name]
            : array();
    }

    public function writeCollection($name, $items)
    {
        $this->data[$name] = array_values($items);
        $this->persist();
    }

    private function persist()
    {
        file_put_contents($this->path, json_encode($this->data));
    }
}

class JsonFileCollection
{
    private $store;
    private $name;

    public function __construct($store, $name)
    {
        $this->store = $store;
        $this->name = $name;
    }

    private function items()
    {
        return $this->store->readCollection($this->name);
    }

    private function save($items)
    {
        $this->store->writeCollection($this->name, $items);
    }

    private function matches($document, $filter)
    {
        foreach ($filter as $key => $value) {
            if (!isset($document[$key]) || $document[$key] != $value) {
                return false;
            }
        }
        return true;
    }

    public function find($filter = array(), $options = array())
    {
        $items = array();
        foreach ($this->items() as $document) {
            if ($this->matches($document, $filter)) {
                $items[] = $document;
            }
        }

        if (isset($options['sort']['updatedAt']) && $options['sort']['updatedAt'] === -1) {
            usort($items, function ($a, $b) {
                return strcmp(arr($b, 'updatedAt'), arr($a, 'updatedAt'));
            });
        }

        return $items;
    }

    public function findOne($filter)
    {
        $items = $this->find($filter);
        return count($items) ? $items[0] : null;
    }

    public function countDocuments($filter = array())
    {
        return count($this->find($filter));
    }

    public function insertOne($document)
    {
        $items = $this->items();
        $items[] = $document;
        $this->save($items);
    }

    public function insertMany($documents)
    {
        foreach ($documents as $document) {
            $this->insertOne($document);
        }
    }

    public function updateOne($filter, $update)
    {
        $items = $this->items();
        $changed = false;

        foreach ($items as $index => $document) {
            if (!$this->matches($document, $filter)) {
                continue;
            }

            if (isset($update['$set']) && is_array($update['$set'])) {
                foreach ($update['$set'] as $key => $value) {
                    $items[$index][$key] = $value;
                }
            }

            if (isset($update['$inc']) && is_array($update['$inc'])) {
                foreach ($update['$inc'] as $key => $value) {
                    $current = isset($items[$index][$key]) ? (int) $items[$index][$key] : 0;
                    $items[$index][$key] = $current + (int) $value;
                }
            }

            if (isset($update['$push']) && is_array($update['$push'])) {
                foreach ($update['$push'] as $key => $value) {
                    if (!isset($items[$index][$key]) || !is_array($items[$index][$key])) {
                        $items[$index][$key] = array();
                    }
                    $items[$index][$key][] = $value;
                }
            }

            $changed = true;
            break;
        }

        if ($changed) {
            $this->save($items);
        }
    }

    public function updateMany($filter, $update)
    {
        $items = $this->items();
        $changed = false;

        foreach ($items as $index => $document) {
            if (!$this->matches($document, $filter)) {
                continue;
            }

            if (isset($update['$set']) && is_array($update['$set'])) {
                foreach ($update['$set'] as $key => $value) {
                    $items[$index][$key] = $value;
                }
            }

            $changed = true;
        }

        if ($changed) {
            $this->save($items);
        }
    }

    public function deleteOne($filter)
    {
        $items = $this->items();
        $deleted = 0;

        foreach ($items as $index => $document) {
            if ($this->matches($document, $filter)) {
                unset($items[$index]);
                $deleted = 1;
                break;
            }
        }

        if ($deleted) {
            $this->save(array_values($items));
        }

        return $deleted;
    }
}

function createJsonCollections($config)
{
    $storePath = __DIR__ . '/../data/store.json';
    $store = new JsonFileStore($storePath);

    return array(
        'users' => $store->getCollection('users'),
        'products' => $store->getCollection('products'),
        'messages' => $store->getCollection('messages'),
        'discountSpins' => $store->getCollection('discountSpins'),
        'chat' => $store->getCollection('chat'),
        'storage' => 'json'
    );
}
