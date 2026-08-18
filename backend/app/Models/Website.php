<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Website extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'domain_id',
        'name',
        'hostname',
        'document_root',
        'status',
        'storage_limit_mb',
        'storage_used_mb',
    ];

    protected $casts = [
        'storage_limit_mb' => 'integer',
        'storage_used_mb' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function domain(): BelongsTo
    {
        return $this->belongsTo(Domain::class);
    }

    public function deployments(): HasMany
    {
        return $this->hasMany(Deployment::class);
    }
}
