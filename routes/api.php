<?php
use Illuminate\Http\Request;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ScraperController;
use App\Http\Controllers\BankStatementController;
use App\Http\Controllers\BankTransactionController;
use App\Models\BankStatementTransaction;
use App\Models\BankStatement;
use Illuminate\Support\Facades\Log;

Route::post('/bank-login', function (Request $request) {
    Log::info('Bank Login API Called', ['request' => $request->all()]);

    return app(ScraperController::class)->scrapeBank($request);
});


// ✅ Store Bank Statement
Route::post('/store-bank-statement', [BankStatementController::class, 'store']);

// ✅ Update Bank Statement (after CSV data extraction)
Route::put('/update-bank-statement/{id}', [BankStatementController::class, 'update']);

// ✅ Store Bank Transactions
Route::post('/store-bank-transactions', [BankTransactionController::class, 'store']);
