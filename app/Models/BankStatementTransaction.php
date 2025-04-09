<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BankStatementTransaction extends Model {
    use HasFactory;

    protected $fillable = [
        'bank_statement_id',
        'posting_date',
        'transaction_date',
        'ref_no',
        'description',
        'amount',
        'transaction_type',
        'balance',
    ];

    protected $casts = [
        'posting_date' => 'date:Y-m-d',
        'transaction_date' => 'date:Y-m-d',
    ];
    
    public function bankStatement() {
        return $this->belongsTo(BankStatement::class);
    }
}
