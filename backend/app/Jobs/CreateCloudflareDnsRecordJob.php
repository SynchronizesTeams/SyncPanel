<?php

namespace App\Jobs;

use App\Models\DnsRecord;
use App\Services\Cloudflare\CloudflareDnsService;
use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CreateCloudflareDnsRecordJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public DnsRecord $dnsRecord
    ) {}

    public function handle(CloudflareDnsService $dnsService): void
    {
        $record = $this->dnsRecord;
        $domain = $record->domain;

        if (!$domain || !$domain->zone_id) {
            Log::warning("Cannot sync DNS record to Cloudflare: Domain missing zone_id");
            return;
        }

        try {
            $cfResult = $dnsService->createRecord($domain->zone_id, [
                'type' => $record->type,
                'name' => $record->name,
                'content' => $record->content,
                'ttl' => $record->ttl,
                'proxied' => $record->proxied,
            ]);

            if (isset($cfResult['id'])) {
                $record->update(['cloudflare_record_id' => $cfResult['id']]);
            }
        } catch (Exception $e) {
            Log::error("Failed to create Cloudflare DNS record: " . $e->getMessage());
        }
    }
}
