<?php

namespace App\Services\Cloudflare;

use App\Models\CloudflareConnection;
use Exception;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

class CloudflareClient
{
    protected ?string $apiToken = null;
    protected ?string $accountId = null;
    protected string $baseUrl = 'https://api.cloudflare.com/client/v4';

    public function __construct()
    {
        $conn = CloudflareConnection::first();
        if ($conn && $conn->api_token) {
            $this->apiToken = $conn->api_token;
            $this->accountId = $conn->account_id;
        } else {
            $this->apiToken = config('services.cloudflare.api_token', env('CLOUDFLARE_API_TOKEN'));
            $this->accountId = config('services.cloudflare.account_id', env('CLOUDFLARE_ACCOUNT_ID'));
        }
    }

    public function isConfigured(): bool
    {
        return !empty($this->apiToken);
    }

    public function getAccountId(): ?string
    {
        return $this->accountId;
    }

    protected function client(): PendingRequest
    {
        if (!$this->isConfigured()) {
            throw new Exception("Cloudflare API Token is not configured.");
        }

        return Http::baseUrl($this->baseUrl)
            ->withToken($this->apiToken)
            ->acceptJson()
            ->retry(3, 200);
    }

    public function get(string $endpoint, array $query = []): array
    {
        $response = $this->client()->get($endpoint, $query);
        return $this->handleResponse($response);
    }

    public function post(string $endpoint, array $data = []): array
    {
        $response = $this->client()->post($endpoint, $data);
        return $this->handleResponse($response);
    }

    public function put(string $endpoint, array $data = []): array
    {
        $response = $this->client()->put($endpoint, $data);
        return $this->handleResponse($response);
    }

    public function delete(string $endpoint): array
    {
        $response = $this->client()->delete($endpoint);
        return $this->handleResponse($response);
    }

    protected function handleResponse($response): array
    {
        $json = $response->json();

        if ($response->failed() || !($json['success'] ?? false)) {
            $errors = $json['errors'] ?? [];
            $errorMsg = !empty($errors) ? implode('; ', array_column($errors, 'message')) : 'Unknown Cloudflare API error';
            throw new Exception("Cloudflare API Error: " . $errorMsg);
        }

        return $json['result'] ?? [];
    }
}
