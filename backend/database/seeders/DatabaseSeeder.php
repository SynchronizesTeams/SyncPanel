<?php

namespace Database\Seeders;

use App\Models\Domain;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Admin user
        User::firstOrCreate(
            ['email' => 'admin@cloudpanel.local'],
            [
                'name' => 'Administrator',
                'password' => Hash::make('admin123456'),
                'role' => 'admin',
                'status' => 'active',
                'max_websites' => 100,
                'max_storage_mb' => 50000,
                'max_dns_records' => 1000,
            ]
        );

        // Demo user
        User::firstOrCreate(
            ['email' => 'demo@cloudpanel.local'],
            [
                'name' => 'Demo User',
                'password' => Hash::make('demo123456'),
                'role' => 'user',
                'status' => 'active',
                'max_websites' => 5,
                'max_storage_mb' => 2048,
                'max_dns_records' => 50,
            ]
        );

        // Demo Domain
        Domain::firstOrCreate(
            ['domain' => 'example.com'],
            [
                'zone_id' => 'mock-zone-id-12345',
                'status' => 'active',
            ]
        );
    }
}
