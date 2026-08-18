<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class SystemSetting extends Model
{
    use HasFactory;

    protected $primaryKey = 'key';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'key',
        'value',
        'is_encrypted',
    ];

    protected $casts = [
        'is_encrypted' => 'boolean',
    ];

    public static function get(string $key, $default = null)
    {
        $setting = static::find($key);
        if (!$setting) {
            return $default;
        }

        if ($setting->is_encrypted && $setting->value) {
            try {
                return Crypt::decryptString($setting->value);
            } catch (\Exception $e) {
                return null;
            }
        }

        return $setting->value ?? $default;
    }

    public static function set(string $key, $value, bool $encrypt = false): void
    {
        $storedValue = $value;
        if ($encrypt && $value !== null) {
            $storedValue = Crypt::encryptString($value);
        }

        static::updateOrCreate(
            ['key' => $key],
            ['value' => $storedValue, 'is_encrypted' => $encrypt]
        );
    }
}
