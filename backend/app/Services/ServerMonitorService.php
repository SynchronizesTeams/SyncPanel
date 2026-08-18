<?php

namespace App\Services;

use Illuminate\Support\Facades\Process;

class ServerMonitorService
{
    public function getMetrics(): array
    {
        $loadAvg = sys_getloadavg();

        // Disk usage
        $diskTotal = disk_total_space('/') ?: 1;
        $diskFree = disk_free_space('/') ?: 0;
        $diskUsed = $diskTotal - $diskFree;
        $diskPercentage = round(($diskUsed / $diskTotal) * 100, 1);

        // Memory usage
        $memTotal = 0;
        $memFree = 0;
        $memAvailable = 0;

        if (file_exists('/proc/meminfo')) {
            $meminfo = file_get_contents('/proc/meminfo');
            preg_match('/MemTotal:\s+(\d+)/', $meminfo, $matchesTotal);
            preg_match('/MemAvailable:\s+(\d+)/', $meminfo, $matchesAvail);

            if (!empty($matchesTotal[1])) {
                $memTotal = (int) $matchesTotal[1] * 1024; // Convert KB to Bytes
            }
            if (!empty($matchesAvail[1])) {
                $memAvailable = (int) $matchesAvail[1] * 1024;
            }
            $memUsed = max(0, $memTotal - $memAvailable);
        } else {
            $memTotal = 8 * 1024 * 1024 * 1024; // Fallback mock 8GB
            $memUsed = 2 * 1024 * 1024 * 1024;
        }

        $memPercentage = $memTotal > 0 ? round(($memUsed / $memTotal) * 100, 1) : 0;

        return [
            'cpu' => [
                'load_1min' => $loadAvg[0] ?? 0.1,
                'load_5min' => $loadAvg[1] ?? 0.1,
                'load_15min' => $loadAvg[2] ?? 0.1,
            ],
            'memory' => [
                'total_mb' => (int) ($memTotal / (1024 * 1024)),
                'used_mb' => (int) ($memUsed / (1024 * 1024)),
                'percentage' => $memPercentage,
            ],
            'disk' => [
                'total_gb' => round($diskTotal / (1024 * 1024 * 1024), 2),
                'used_gb' => round($diskUsed / (1024 * 1024 * 1024), 2),
                'free_gb' => round($diskFree / (1024 * 1024 * 1024), 2),
                'percentage' => $diskPercentage,
            ],
            'services' => $this->getServicesStatus(),
        ];
    }

    protected function getServicesStatus(): array
    {
        $services = ['nginx', 'postgresql', 'redis', 'cloudflared'];
        $statuses = [];

        foreach ($services as $service) {
            if (file_exists('/usr/bin/systemctl')) {
                $res = Process::run("systemctl is-active {$service}");
                $statuses[$service] = trim($res->output()) === 'active' ? 'running' : 'stopped';
            } else {
                $statuses[$service] = 'running'; // Local dev default
            }
        }

        return $statuses;
    }
}
