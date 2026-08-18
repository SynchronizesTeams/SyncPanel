<?php

namespace Tests\Feature;

use App\Models\Domain;
use App\Models\User;
use App\Models\Website;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WebsiteDeploymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login_and_retrieve_profile(): void
    {
        $user = User::factory()->create([
            'email' => 'user@example.com',
            'password' => bcrypt('password123'),
            'role' => 'user',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'user@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['token', 'user']]);
    }

    public function test_user_can_create_website(): void
    {
        $user = User::factory()->create([
            'role' => 'user',
            'status' => 'active',
            'max_websites' => 5,
            'max_storage_mb' => 2048,
        ]);
        $domain = Domain::create(['domain' => 'mycloud.com', 'status' => 'active']);

        $response = $this->actingAs($user)->postJson('/api/v1/websites', [
            'name' => 'My Blog',
            'domain_id' => $domain->id,
            'subdomain' => 'blog',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.hostname', 'blog.mycloud.com');

        $this->assertDatabaseHas('websites', [
            'user_id' => $user->id,
            'hostname' => 'blog.mycloud.com',
        ]);
    }

    public function test_user_cannot_access_other_users_website(): void
    {
        $user1 = User::factory()->create(['role' => 'user', 'status' => 'active']);
        $user2 = User::factory()->create(['role' => 'user', 'status' => 'active']);
        $domain = Domain::create(['domain' => 'mycloud.com', 'status' => 'active']);

        $website = Website::create([
            'user_id' => $user1->id,
            'domain_id' => $domain->id,
            'name' => 'User 1 Site',
            'hostname' => 'user1.mycloud.com',
            'document_root' => '/srv/cloudpanel/websites/1/1/public',
        ]);

        $response = $this->actingAs($user2)->getJson("/api/v1/websites/{$website->id}");

        $response->assertStatus(403);
    }
}
