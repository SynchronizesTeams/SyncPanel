<?php

namespace App\Policies;

use App\Models\DnsRecord;
use App\Models\User;

class DnsRecordPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return null;
    }

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, DnsRecord $dnsRecord): bool
    {
        return $user->id === $dnsRecord->user_id;
    }

    public function create(User $user): bool
    {
        return $user->isActive();
    }

    public function update(User $user, DnsRecord $dnsRecord): bool
    {
        return $user->isActive() && $user->id === $dnsRecord->user_id;
    }

    public function delete(User $user, DnsRecord $dnsRecord): bool
    {
        return $user->isActive() && $user->id === $dnsRecord->user_id;
    }
}
