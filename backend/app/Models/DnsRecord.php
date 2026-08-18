<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DnsRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'domain_id',
        'cloudflare_record_id',
        'type',
        'name',
        'content',
        'ttl',
        'proxied',
    ];

    protected $casts = [
        'ttl' => 'integer',
        'proxied' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function domain(): BelongsTo
    {
        return $this->belongsTo(Domain::class);
    }
}
