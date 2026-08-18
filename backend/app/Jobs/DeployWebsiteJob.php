<?php

namespace App\Jobs;

use App\Models\Deployment;
use App\Services\Deployment\ZipExtractionService;
use App\Services\Website\NginxService;
use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class DeployWebsiteJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public Deployment $deployment,
        public string $zipFilePath
    ) {}

    public function handle(
        ZipExtractionService $zipService,
        NginxService $nginxService
    ): void {
        $deployment = $this->deployment;
        $website = $deployment->website;

        $deployment->update([
            'status' => 'processing',
            'started_at' => now(),
        ]);
        $website->update(['status' => 'deploying']);

        try {
            $destDir = $website->document_root;
            $extractedSizeMb = $zipService->extract($this->zipFilePath, $destDir);

            // Clean up temporary uploaded zip file
            if (file_exists($this->zipFilePath)) {
                @unlink($this->zipFilePath);
            }

            // Generate vhost & enable Nginx
            $nginxService->generateAndEnable($website);

            // Update website & deployment status
            $website->update([
                'status' => 'active',
                'storage_used_mb' => $extractedSizeMb,
            ]);

            $deployment->update([
                'status' => 'success',
                'storage_used_mb' => $extractedSizeMb,
                'completed_at' => now(),
            ]);

            // Dispatch storage recalculation
            CalculateStorageUsageJob::dispatch($website->user_id);
        } catch (Exception $e) {
            if (file_exists($this->zipFilePath)) {
                @unlink($this->zipFilePath);
            }

            $website->update(['status' => 'failed']);
            $deployment->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);
        }
    }
}
