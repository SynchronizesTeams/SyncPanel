<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\DeleteWebsiteJob;
use App\Jobs\DeployWebsiteJob;
use App\Models\Deployment;
use App\Models\Domain;
use App\Models\Website;
use App\Services\Resource\QuotaService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class WebsiteController extends Controller
{
    public function __construct(
        public QuotaService $quotaService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Website::with(['domain', 'user']);

        if (!$user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        $websites = $query->latest()->get();

        return response()->json([
            'success' => true,
            'data' => $websites,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'name' => 'required|string|max:100',
            'domain_id' => 'required|exists:domains,id',
            'subdomain' => 'required|string|alpha_dash|max:63',
        ]);

        try {
            $this->quotaService->checkWebsiteQuota($user);

            $domain = Domain::findOrFail($request->domain_id);
            $hostname = strtolower($request->subdomain . '.' . $domain->domain);

            if (Website::where('hostname', $hostname)->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => "Hostname {$hostname} is already taken.",
                ], 422);
            }

            $websiteRoot = config('app.website_root', '/srv/cloudpanel/websites');
            $website = Website::create([
                'user_id' => $user->id,
                'domain_id' => $domain->id,
                'name' => $request->name,
                'hostname' => $hostname,
                'document_root' => '',
                'status' => 'creating',
                'storage_limit_mb' => 500,
                'storage_used_mb' => 0,
            ]);

            $docRoot = "{$websiteRoot}/{$user->id}/{$website->id}/public";
            $website->update(['document_root' => $docRoot]);

            return response()->json([
                'success' => true,
                'message' => 'Website created successfully. You can now upload deployment ZIP.',
                'data' => $website->load(['domain']),
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $website = Website::with(['domain', 'user', 'deployments' => function ($q) {
            $q->latest()->take(10);
        }])->findOrFail($id);

        Gate::authorize('view', $website);

        return response()->json([
            'success' => true,
            'data' => $website,
        ]);
    }

    public function deploy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $website = Website::findOrFail($id);

        Gate::authorize('update', $website);

        $request->validate([
            'file' => 'required|file|mimes:zip|max:102400',
        ]);

        $file = $request->file('file');
        $sizeMb = (int) ceil($file->getSize() / (1024 * 1024));

        try {
            $this->quotaService->checkStorageQuota($user, $sizeMb);

            $tempPath = storage_path('app/temp_uploads/' . Str::uuid() . '.zip');
            @mkdir(dirname($tempPath), 0755, true);
            $file->move(dirname($tempPath), basename($tempPath));

            $deployment = Deployment::create([
                'website_id' => $website->id,
                'user_id' => $user->id,
                'filename' => $file->getClientOriginalName(),
                'status' => 'pending',
                'storage_used_mb' => 0,
            ]);

            DeployWebsiteJob::dispatch($deployment, $tempPath);

            return response()->json([
                'success' => true,
                'message' => 'Deployment queued successfully.',
                'data' => $deployment,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $website = Website::findOrFail($id);

        Gate::authorize('delete', $website);

        $website->update(['status' => 'deleting']);
        DeleteWebsiteJob::dispatch($website);

        return response()->json([
            'success' => true,
            'message' => 'Website deletion has been queued.',
        ]);
    }
}
