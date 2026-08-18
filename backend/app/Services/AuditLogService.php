<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Arr;

class AuditLogService
{
    protected array $sensitiveKeys = [
        'password',
        'password_confirmation',
        'api_token',
        'token',
        'secret',
        'authorization',
    ];

    public function log(
        ?User $user,
        string $action,
        ?string $resourceType = null,
        ?string $resourceId = null,
        array $metadata = []
    ): AuditLog {
        $sanitizedMetadata = $this->sanitizeMetadata($metadata);

        return AuditLog::create([
            'user_id' => $user?->id,
            'action' => strtoupper($action),
            'resource_type' => $resourceType,
            'resource_id' => (string) $resourceId,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'metadata' => $sanitizedMetadata,
        ]);
    }

    protected function sanitizeMetadata(array $data): array
    {
        foreach ($data as $key => $value) {
            if (in_array(strtolower($key), $this->sensitiveKeys)) {
                $data[$key] = '***REDACTED***';
            } elseif (is_array($value)) {
                $data[$key] = $this->sanitizeMetadata($value);
            }
        }

        return $data;
    }
}
