<?php

namespace App\Jobs;

use App\Services\Cloudflare\CloudflareZoneService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SyncCloudflareZonesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(CloudflareZoneService $zoneService): void
    {
        $zoneService->syncZones();
    }
}
