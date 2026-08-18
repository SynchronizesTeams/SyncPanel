<?php

namespace App\Jobs;

use App\Models\Website;
use App\Services\Website\NginxService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\File;

class DeleteWebsiteJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public Website $website
    ) {}

    public function handle(NginxService $nginxService): void
    {
        $website = $this->website;
        $userId = $website->user_id;

        // 1. Remove Nginx config
        $nginxService->remove($website);

        // 2. Remove website files
        if ($website->document_root && File::exists($website->document_root)) {
            File::deleteDirectory(dirname($website->document_root));
        }

        // 3. Delete database record
        $website->delete();

        // 4. Recalculate usage
        CalculateStorageUsageJob::dispatch($userId);
    }
}
