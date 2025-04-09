<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BankStatement extends Model {
    use HasFactory;

    protected $fillable = [
        'full_name',
        'bank_name',
        'unique_code',
        'account_no',
        'account_name',
        'account_type',
        'statement_month',
        'opening_balance',
        'closing_balance',
        'method',
        'path',
    ];

    public function transactions() {
        return $this->hasMany(BankStatementTransaction::class);
    }
}
