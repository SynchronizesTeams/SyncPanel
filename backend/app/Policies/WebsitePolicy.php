<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Website;

class WebsitePolicy
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

    public function view(User $user, Website $website): bool
    {
        return $user->id === $website->user_id;
    }

    public function create(User $user): bool
    {
        return $user->isActive();
    }

    public function update(User $user, Website $website): bool
    {
        return $user->isActive() && $user->id === $website->user_id;
    }

    public function delete(User $user, Website $website): bool
    {
        return $user->isActive() && $user->id === $website->user_id;
    }
}
