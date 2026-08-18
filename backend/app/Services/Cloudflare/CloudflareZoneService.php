<?php

namespace App\Services\Cloudflare;

use App\Models\Domain;
use Exception;
use Illuminate\Support\Facades\Log;

class CloudflareZoneService
{
    public function __construct(
        protected CloudflareClient $client
    ) {}

    public function fetchZones(): array
    {
        if (!$this->client->isConfigured()) {
            return [];
        }

        try {
            return $this->client->get('/zones');
        } catch (Exception $e) {
            Log::error("Failed to fetch Cloudflare zones: " . $e->getMessage());
            return [];
        }
    }

    public function syncZones(): int
    {
        $zones = $this->fetchZones();
        $syncedCount = 0;

        foreach ($zones as $zone) {
            Domain::updateOrCreate(
                ['domain' => $zone['name']],
                [
                    'zone_id' => $zone['id'],
                    'status' => ($zone['status'] ?? 'active') === 'active' ? 'active' : 'disabled',
                ]
            );
            $syncedCount++;
        }

        return $syncedCount;
    }
}
