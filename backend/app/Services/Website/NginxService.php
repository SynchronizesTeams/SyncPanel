<?php

namespace App\Services\Website;

use App\Models\Website;
use Exception;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;

class NginxService
{
    protected string $availableDir;
    protected string $enabledDir;

    public function __construct()
    {
        $this->availableDir = config('app.nginx_sites_available', '/etc/nginx/sites-available/cloudpanel');
        $this->enabledDir = config('app.nginx_sites_enabled', '/etc/nginx/sites-enabled');
    }

    public function generateAndEnable(Website $website): bool
    {
        $configContent = $this->buildConfig($website);
        $vhostFile = "{$this->availableDir}/website_{$website->id}.conf";
        $symlinkFile = "{$this->enabledDir}/cloudpanel_{$website->id}.conf";

        if (!file_exists($this->availableDir)) {
            @mkdir($this->availableDir, 0755, true);
        }

        file_put_contents($vhostFile, $configContent);

        if (file_exists('/usr/sbin/nginx') || file_exists('/usr/bin/nginx')) {
            // Validate syntax
            $result = Process::run('nginx -t');
            if ($result->failed()) {
                unlink($vhostFile);
                throw new Exception("Nginx syntax validation failed: " . $result->errorOutput());
            }

            if (!file_exists($symlinkFile)) {
                @symlink($vhostFile, $symlinkFile);
            }

            Process::run('systemctl reload nginx || service nginx reload');
        } else {
            Log::info("Nginx binary not detected locally. Virtualhost generated at {$vhostFile}");
        }

        return true;
    }

    public function remove(Website $website): void
    {
        $vhostFile = "{$this->availableDir}/website_{$website->id}.conf";
        $symlinkFile = "{$this->enabledDir}/cloudpanel_{$website->id}.conf";

        if (file_exists($symlinkFile)) {
            @unlink($symlinkFile);
        }

        if (file_exists($vhostFile)) {
            @unlink($vhostFile);
        }

        if (file_exists('/usr/sbin/nginx') || file_exists('/usr/bin/nginx')) {
            Process::run('systemctl reload nginx || service nginx reload');
        }
    }

    protected function buildConfig(Website $website): string
    {
        return <<<NGINX
server {
    listen 127.0.0.1:80;
    server_name {$website->hostname};

    root {$website->document_root};
    index index.html index.htm;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~ /\\.(?!well-known) {
        deny all;
    }

    access_log /var/log/nginx/cloudpanel_{$website->id}_access.log;
    error_log /var/log/nginx/cloudpanel_{$website->id}_error.log;
}
NGINX;
    }
}
