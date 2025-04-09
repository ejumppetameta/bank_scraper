<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\Request;
use App\Models\BankStatementTransaction;
use Illuminate\Support\Facades\Log;

class BankTransactionController extends Controller
{

    public function store(Request $request)
    {
        try {
            Log::info('📡 Incoming Transactions Request:', ['request' => $request->all()]); // ✅ Log entire request

            $transactions = $request->input('transactions');

            if (empty($transactions)) {
                Log::warning('⚠️ No transactions received!');
                return response()->json(["success" => false, "message" => "No transactions received"], 400);
            }

            foreach ($transactions as $data) {
                Log::info('🔍 Storing Transaction Data:', $data); // ✅ Log each transaction before inserting

                // ✅ Debug: Check the raw transaction date format
                Log::info('🗓️ Raw Transaction Date:', ['transaction_date' => $data['transaction_date'] ?? 'NULL']);

                // ✅ Debug: Check the raw balance & amount
                Log::info('💰 Raw Balance & Amount:', ['balance' => $data['balance'] ?? 'NULL', 'amount' => $data['amount'] ?? 'NULL']);

                // ✅ Fix: Convert date format only if it exists
                $postingDate = !empty($data['posting_date']) ? Carbon::createFromFormat('Y-m-d', trim($data['posting_date']))->format('Y-m-d') : null;
                $transactionDate = !empty($data['transaction_date']) ? Carbon::createFromFormat('Y-m-d', trim($data['transaction_date']))->format('Y-m-d') : null;

                // ✅ Debug: Check formatted date
                Log::info('📆 Formatted Transaction Date:', ['formatted_transaction_date' => $transactionDate]);

                // ✅ Ensure balance and amount are always numeric
                $amount = is_numeric($data['amount']) ? floatval($data['amount']) : 0;
                $balance = is_numeric($data['balance']) ? floatval($data['balance']) : 0;

                Log::info('💵 Final Processed Amount & Balance:', ['amount' => $amount, 'balance' => $balance]);

                // ✅ Insert into database
                BankStatementTransaction::create([
                    'bank_statement_id' => $data['bank_statement_id'],
                    'posting_date' => $postingDate,
                    'transaction_date' => $transactionDate,
                    'ref_no' => $data['ref_no'] ?? null,
                    'description' => $data['description'],
                    'amount' => $amount,
                    'balance' => $balance,
                    'transaction_type' => $data['transaction_type'],
                ]);
            }

            Log::info('✅ Transactions stored successfully!');
            return response()->json(["success" => true, "message" => "Transactions stored"]);
        } catch (\Exception $e) {
            Log::error('❌ Error storing transactions:', ['error' => $e->getMessage()]);

            return response()->json(["success" => false, "message" => "Failed to store transactions", "error" => $e->getMessage()], 500);
        }
    }

    // public function store(Request $request)
    // {
    //     try {
    //         $transactions = $request->input('transactions');

    //         // ✅ Store all transactions with updated schema
    //         foreach ($transactions as $data) {
    //             BankStatementTransaction::create([
    //                 'bank_statement_id' => $data['bank_statement_id'],
    //                 'posting_date' => $data['posting_date'], // ✅ New field
    //                 'transaction_date' => $data['transaction_date'],
    //                 'ref_no' => $data['ref_no'] ?? null, // ✅ New field (nullable)
    //                 'description' => $data['description'],
    //                 'amount' => $data['amount'],
    //                 'transaction_type' => $data['transaction_type'],
    //                 'balance' => $data['balance'] ?? null, // ✅ New field (nullable)
    //             ]);
    //         }

    //         return response()->json([
    //             "success" => true,
    //             "message" => "Transactions stored"
    //         ], 201); // HTTP 201 Created

    //     } catch (\Exception $e) {
    //         return response()->json([
    //             "success" => false,
    //             "message" => "Failed to store transactions",
    //             "error" => $e->getMessage()
    //         ], 500); // HTTP 500 Internal Server Error
    //     }
    // }


    // public function store(Request $request)
    // {
    //     try {
    //         Log::info('📡 Incoming Transactions:', $request->all()); // ✅ Log full request payload

    //         $transactions = $request->input('transactions');

    //         if (empty($transactions)) {
    //             Log::warning('⚠️ No transactions received!');
    //             return response()->json(["success" => false, "message" => "No transactions received"], 400);
    //         }

    //         foreach ($transactions as $data) {
    //             Log::info('🔍 Storing Transaction:', $data); // ✅ Log each transaction

    //             // Convert date format from 'DD-MM-YYYY' to 'YYYY-MM-DD'
    //             $postingDate = !empty($data['posting_date']) ? Carbon::createFromFormat('d-m-Y', trim($data['posting_date']))->format('Y-m-d') : null;
    //             $transactionDate = !empty($data['transaction_date']) ? Carbon::createFromFormat('d-m-Y', trim($data['transaction_date']))->format('Y-m-d') : null;

    //             BankStatementTransaction::create([
    //                 'bank_statement_id' => $data['bank_statement_id'],
    //                 'posting_date' => $postingDate ?? null,
    //                 'transaction_date' => $transactionDate,
    //                 'ref_no' => $data['ref_no'] ?? null,
    //                 'description' => $data['description'],
    //                 'amount' => $data['amount'],
    //                 'balance' => $data['balance'] ?? null,
    //                 'transaction_type' => $data['transaction_type'],
    //             ]);
    //         }

    //         Log::info('✅ Transactions stored successfully!');

    //         return response()->json(["success" => true, "message" => "Transactions stored"]);
    //     } catch (\Exception $e) {
    //         Log::error('❌ Error storing transactions:', ['error' => $e->getMessage()]);

    //         return response()->json(["success" => false, "message" => "Failed to store transactions", "error" => $e->getMessage()], 500);
    //     }
    // }


}
