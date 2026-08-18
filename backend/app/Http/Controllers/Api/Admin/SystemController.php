<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ResourceUsage;
use App\Models\Website;
use App\Services\ServerMonitorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SystemController extends Controller
{
    public function health(ServerMonitorService $monitorService): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $monitorService->getMetrics(),
        ]);
    }

    public function resourceUsage(): JsonResponse
    {
        $totalWebsites = Website::count();
        $totalStorageMb = (int) Website::sum('storage_used_mb');
        $usages = ResourceUsage::with('user')->get();

        return response()->json([
            'success' => true,
            'data' => [
                'total_websites' => $totalWebsites,
                'total_storage_mb' => $totalStorageMb,
                'user_breakdown' => $usages,
            ],
        ]);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $query = AuditLog::with('user')->latest();

        if ($request->filled('action')) {
            $query->where('action', 'LIKE', '%' . $request->action . '%');
        }

        $logs = $query->paginate(30);

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }
}
