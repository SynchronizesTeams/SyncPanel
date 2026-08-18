<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResourceUsage extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'storage_used_mb',
        'website_count',
        'bandwidth_used_mb',
    ];

    protected $casts = [
        'storage_used_mb' => 'integer',
        'website_count' => 'integer',
        'bandwidth_used_mb' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
