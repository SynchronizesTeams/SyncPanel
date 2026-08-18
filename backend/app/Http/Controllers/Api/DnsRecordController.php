<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\CreateCloudflareDnsRecordJob;
use App\Jobs\DeleteCloudflareDnsRecordJob;
use App\Models\DnsRecord;
use App\Models\Domain;
use App\Services\Resource\QuotaService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class DnsRecordController extends Controller
{
    public function __construct(
        public QuotaService $quotaService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = DnsRecord::with(['domain', 'user']);

        if (!$user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        $records = $query->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $records,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'domain_id' => 'required|exists:domains,id',
            'type' => 'required|string|in:A,AAAA,CNAME,TXT',
            'name' => 'required|string|max:255',
            'content' => 'required|string',
            'ttl' => 'nullable|integer|min:1',
            'proxied' => 'nullable|boolean',
        ]);

        try {
            $this->quotaService->checkDnsQuota($user);

            $domain = Domain::findOrFail($request->domain_id);

            $record = DnsRecord::create([
                'user_id' => $user->id,
                'domain_id' => $domain->id,
                'type' => strtoupper($request->type),
                'name' => $request->name,
                'content' => $request->content,
                'ttl' => $request->ttl ?? 1,
                'proxied' => $request->boolean('proxied', true),
            ]);

            CreateCloudflareDnsRecordJob::dispatch($record);

            return response()->json([
                'success' => true,
                'message' => 'DNS Record created successfully and queued for Cloudflare sync.',
                'data' => $record->load(['domain']),
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $record = DnsRecord::findOrFail($id);

        Gate::authorize('update', $record);

        $request->validate([
            'type' => 'required|string|in:A,AAAA,CNAME,TXT',
            'name' => 'required|string|max:255',
            'content' => 'required|string',
            'ttl' => 'nullable|integer|min:1',
            'proxied' => 'nullable|boolean',
        ]);

        $record->update([
            'type' => strtoupper($request->type),
            'name' => $request->name,
            'content' => $request->content,
            'ttl' => $request->ttl ?? 1,
            'proxied' => $request->boolean('proxied', true),
        ]);

        CreateCloudflareDnsRecordJob::dispatch($record);

        return response()->json([
            'success' => true,
            'message' => 'DNS Record updated successfully.',
            'data' => $record->load(['domain']),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $record = DnsRecord::findOrFail($id);

        Gate::authorize('delete', $record);

        if ($record->cloudflare_record_id && $record->domain && $record->domain->zone_id) {
            DeleteCloudflareDnsRecordJob::dispatch($record->domain->zone_id, $record->cloudflare_record_id);
        }

        $record->delete();

        return response()->json([
            'success' => true,
            'message' => 'DNS record deleted successfully.',
        ]);
    }
}
