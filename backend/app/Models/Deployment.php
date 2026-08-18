<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Deployment extends Model
{
    use HasFactory;

    protected $fillable = [
        'website_id',
        'user_id',
        'filename',
        'status',
        'error_message',
        'storage_used_mb',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'storage_used_mb' => 'integer',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function website(): BelongsTo
    {
        return $this->belongsTo(Website::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
