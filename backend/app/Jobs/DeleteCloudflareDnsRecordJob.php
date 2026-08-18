<?php

namespace App\Jobs;

use App\Services\Cloudflare\CloudflareDnsService;
use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class DeleteCloudflareDnsRecordJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $zoneId,
        public string $cloudflareRecordId
    ) {}

    public function handle(CloudflareDnsService $dnsService): void
    {
        try {
            $dnsService->deleteRecord($this->zoneId, $this->cloudflareRecordId);
        } catch (Exception $e) {
            Log::error("Failed to delete Cloudflare DNS record {$this->cloudflareRecordId}: " . $e->getMessage());
        }
    }
}
