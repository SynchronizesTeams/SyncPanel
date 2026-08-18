<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class CloudflareConnection extends Model
{
    use HasFactory;

    protected $fillable = [
        'account_id',
        'api_token_encrypted',
        'tunnel_id',
        'tunnel_name',
        'status',
        'error_message',
    ];

    public function getApiTokenAttribute(): ?string
    {
        if (!$this->api_token_encrypted) {
            return null;
        }

        try {
            return Crypt::decryptString($this->api_token_encrypted);
        } catch (\Exception $e) {
            return null;
        }
    }

    public function setApiTokenAttribute(?string $value): void
    {
        $this->attributes['api_token_encrypted'] = $value ? Crypt::encryptString($value) : null;
    }
}
