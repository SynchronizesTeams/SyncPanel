<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function __construct(
        protected AuditLogService $auditLogService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $users = User::withCount(['websites', 'dnsRecords'])
            ->with('resourceUsage')
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|string|in:admin,user',
            'status' => 'required|string|in:active,suspended',
            'max_websites' => 'nullable|integer|min:1',
            'max_storage_mb' => 'nullable|integer|min:100',
            'max_dns_records' => 'nullable|integer|min:1',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'status' => $request->status,
            'max_websites' => $request->max_websites ?? 5,
            'max_storage_mb' => $request->max_storage_mb ?? 2048,
            'max_dns_records' => $request->max_dns_records ?? 50,
        ]);

        $this->auditLogService->log(
            $request->user(),
            'USER_CREATED',
            'User',
            $user->id,
            ['email' => $user->email, 'role' => $user->role]
        );

        return response()->json([
            'success' => true,
            'message' => 'User created successfully.',
            'data' => $user,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $user = User::with(['websites.domain', 'dnsRecords.domain', 'resourceUsage', 'auditLogs' => function ($q) {
            $q->latest()->take(20);
        }])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $user,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => "required|email|unique:users,email,{$id}",
            'password' => 'nullable|string|min:8',
            'role' => 'required|string|in:admin,user',
            'status' => 'required|string|in:active,suspended',
            'max_websites' => 'required|integer|min:1',
            'max_storage_mb' => 'required|integer|min:100',
            'max_dns_records' => 'required|integer|min:1',
        ]);

        $data = [
            'name' => $request->name,
            'email' => $request->email,
            'role' => $request->role,
            'status' => $request->status,
            'max_websites' => $request->max_websites,
            'max_storage_mb' => $request->max_storage_mb,
            'max_dns_records' => $request->max_dns_records,
        ];

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        $this->auditLogService->log(
            $request->user(),
            'USER_UPDATED',
            'User',
            $user->id,
            ['email' => $user->email, 'status' => $user->status]
        );

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully.',
            'data' => $user,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $admin = $request->user();
        if ($admin->id === $id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot delete your own admin account.',
            ], 422);
        }

        $user = User::findOrFail($id);
        $userId = $user->id;
        $email = $user->email;

        $user->delete();

        $this->auditLogService->log(
            $admin,
            'USER_DELETED',
            'User',
            $userId,
            ['email' => $email]
        );

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully.',
        ]);
    }
}
