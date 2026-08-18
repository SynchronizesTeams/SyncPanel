<?php

use App\Http\Controllers\Api\Admin\CloudflareController as AdminCloudflareController;
use App\Http\Controllers\Api\Admin\SystemController as AdminSystemController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DnsRecordController;
use App\Http\Controllers\Api\WebsiteController;
use App\Models\Domain;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    // Public Auth
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Authenticated routes
    Route::middleware('auth:sanctum')->group(function () {

        // User auth details
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::put('/auth/password', [AuthController::class, 'updatePassword']);

        // Allowed Domains
        Route::get('/domains', function () {
            return response()->json([
                'success' => true,
                'data' => Domain::where('status', 'active')->get(),
            ]);
        });

        // Website Management
        Route::get('/websites', [WebsiteController::class, 'index']);
        Route::post('/websites', [WebsiteController::class, 'store']);
        Route::get('/websites/{id}', [WebsiteController::class, 'show']);
        Route::post('/websites/{id}/deploy', [WebsiteController::class, 'deploy']);
        Route::delete('/websites/{id}', [WebsiteController::class, 'destroy']);

        // DNS Record Management
        Route::get('/dns-records', [DnsRecordController::class, 'index']);
        Route::post('/dns-records', [DnsRecordController::class, 'store']);
        Route::put('/dns-records/{id}', [DnsRecordController::class, 'update']);
        Route::delete('/dns-records/{id}', [DnsRecordController::class, 'destroy']);

        // Admin Routes
        Route::prefix('admin')->group(function () {
            Route::apiResource('users', AdminUserController::class);

            Route::get('/cloudflare/status', [AdminCloudflareController::class, 'status']);
            Route::post('/cloudflare/configure', [AdminCloudflareController::class, 'configure']);
            Route::post('/cloudflare/sync', [AdminCloudflareController::class, 'syncZones']);

            Route::get('/resource-usage', [AdminSystemController::class, 'resourceUsage']);
            Route::get('/audit-logs', [AdminSystemController::class, 'auditLogs']);
            Route::get('/system/health', [AdminSystemController::class, 'health']);
        });
    });
});
