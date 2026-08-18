<?php

namespace App\Services\Cloudflare;

use Exception;
use Illuminate\Support\Facades\Process;

class CloudflareTunnelService
{
    public function __construct(
        protected CloudflareClient $client
    ) {}

    public function getStatus(): array
    {
        $cloudflaredActive = false;
        $processOutput = '';

        if (file_exists('/usr/usr/bin/cloudflared') || file_exists('/usr/bin/cloudflared') || file_exists('/usr/local/bin/cloudflared')) {
            $res = Process::run('systemctl is-active cloudflared || pgrep cloudflared');
            $cloudflaredActive = $res->successful() && (str_contains($res->output(), 'active') || !empty(trim($res->output())));
            $processOutput = trim($res->output());
        }

        $apiStatus = 'not_configured';
        if ($this->client->isConfigured() && $this->client->getAccountId()) {
            try {
                $tunnels = $this->client->get("/accounts/{$this->client->getAccountId()}/tunnels");
                $apiStatus = !empty($tunnels) ? 'connected' : 'no_tunnels_found';
            } catch (Exception $e) {
                $apiStatus = 'error: ' . $e->getMessage();
            }
        }

        return [
            'configured' => $this->client->isConfigured(),
            'cloudflared_installed' => file_exists('/usr/bin/cloudflared') || file_exists('/usr/local/bin/cloudflared'),
            'cloudflared_service_active' => $cloudflaredActive,
            'api_status' => $apiStatus,
            'details' => $processOutput,
        ];
    }
}
