<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CloudflareConnection;
use App\Models\Domain;
use App\Services\Cloudflare\CloudflareTunnelService;
use App\Services\Cloudflare\CloudflareZoneService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CloudflareController extends Controller
{
    public function status(CloudflareTunnelService $tunnelService): JsonResponse
    {
        $status = $tunnelService->getStatus();

        return response()->json([
            'success' => true,
            'data' => $status,
        ]);
    }

    public function configure(Request $request): JsonResponse
    {
        $request->validate([
            'account_id' => 'required|string',
            'api_token' => 'required|string',
            'tunnel_id' => 'nullable|string',
            'tunnel_name' => 'nullable|string',
        ]);

        $conn = CloudflareConnection::firstOrNew([]);
        $conn->account_id = $request->account_id;
        $conn->api_token = $request->api_token;
        $conn->tunnel_id = $request->tunnel_id;
        $conn->tunnel_name = $request->tunnel_name;
        $conn->status = 'connected';
        $conn->save();

        return response()->json([
            'success' => true,
            'message' => 'Cloudflare settings updated successfully.',
            'data' => [
                'account_id' => $conn->account_id,
                'tunnel_id' => $conn->tunnel_id,
                'tunnel_name' => $conn->tunnel_name,
                'status' => $conn->status,
            ],
        ]);
    }

    public function syncZones(CloudflareZoneService $zoneService): JsonResponse
    {
        try {
            $count = $zoneService->syncZones();

            return response()->json([
                'success' => true,
                'message' => "Successfully synchronized {$count} zones from Cloudflare.",
                'data' => Domain::all(),
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
