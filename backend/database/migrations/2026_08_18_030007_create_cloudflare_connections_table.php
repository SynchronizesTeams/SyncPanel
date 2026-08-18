<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cloudflare_connections', function (Blueprint $table) {
            $table->id();
            $table->string('account_id')->nullable();
            $table->text('api_token_encrypted')->nullable();
            $table->string('tunnel_id')->nullable();
            $table->string('tunnel_name')->nullable();
            $table->string('status')->default('disconnected'); // connected, disconnected, error
            $table->text('error_message')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cloudflare_connections');
    }
};
