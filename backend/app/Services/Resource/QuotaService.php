<?php

namespace App\Services\Resource;

use App\Models\DnsRecord;
use App\Models\User;
use App\Models\Website;
use Exception;

class QuotaService
{
    public function checkWebsiteQuota(User $user): void
    {
        if ($user->isAdmin()) {
            return;
        }

        $currentWebsites = Website::where('user_id', $user->id)->count();
        if ($currentWebsites >= $user->max_websites) {
            throw new Exception("Website quota exceeded. Your plan limit is {$user->max_websites} websites.");
        }
    }

    public function checkStorageQuota(User $user, int $additionalStorageMb): void
    {
        if ($user->isAdmin()) {
            return;
        }

        $usedStorageMb = Website::where('user_id', $user->id)->sum('storage_used_mb');
        if (($usedStorageMb + $additionalStorageMb) > $user->max_storage_mb) {
            throw new Exception("Storage quota exceeded. Your plan limit is {$user->max_storage_mb} MB (used: {$usedStorageMb} MB).");
        }
    }

    public function checkDnsQuota(User $user): void
    {
        if ($user->isAdmin()) {
            return;
        }

        $currentRecords = DnsRecord::where('user_id', $user->id)->count();
        if ($currentRecords >= $user->max_dns_records) {
            throw new Exception("DNS record quota exceeded. Your plan limit is {$user->max_dns_records} records.");
        }
    }
}
