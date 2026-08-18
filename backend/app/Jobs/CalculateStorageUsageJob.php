<?php

namespace App\Jobs;

use App\Models\ResourceUsage;
use App\Models\Website;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class CalculateStorageUsageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $userId
    ) {}

    public function handle(): void
    {
        $totalStorageMb = (int) Website::where('user_id', $this->userId)->sum('storage_used_mb');
        $websiteCount = (int) Website::where('user_id', $this->userId)->count();

        ResourceUsage::updateOrCreate(
            ['user_id' => $this->userId],
            [
                'storage_used_mb' => $totalStorageMb,
                'website_count' => $websiteCount,
            ]
        );
    }
}
