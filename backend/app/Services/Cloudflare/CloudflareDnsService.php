<?php

namespace App\Services\Cloudflare;

use Exception;

class CloudflareDnsService
{
    public function __construct(
        protected CloudflareClient $client
    ) {}

    public function listRecords(string $zoneId, array $query = []): array
    {
        return $this->client->get("/zones/{$zoneId}/dns_records", $query);
    }

    public function createRecord(string $zoneId, array $data): array
    {
        return $this->client->post("/zones/{$zoneId}/dns_records", [
            'type' => strtoupper($data['type']),
            'name' => $data['name'],
            'content' => $data['content'],
            'ttl' => (int) ($data['ttl'] ?? 1),
            'proxied' => (bool) ($data['proxied'] ?? true),
        ]);
    }

    public function updateRecord(string $zoneId, string $recordId, array $data): array
    {
        return $this->client->put("/zones/{$zoneId}/dns_records/{$recordId}", [
            'type' => strtoupper($data['type']),
            'name' => $data['name'],
            'content' => $data['content'],
            'ttl' => (int) ($data['ttl'] ?? 1),
            'proxied' => (bool) ($data['proxied'] ?? true),
        ]);
    }

    public function deleteRecord(string $zoneId, string $recordId): bool
    {
        $this->client->delete("/zones/{$zoneId}/dns_records/{$recordId}");
        return true;
    }
}
