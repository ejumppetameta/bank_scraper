<?php

namespace App\Http\Controllers;

use App\Models\BankStatement;
use App\Models\BankStatementTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\DomCrawler\Crawler;

class BankStatementController extends Controller {

    public function store(Request $request)
    {
        $bankStatement = BankStatement::create([
            'full_name' => $request->input('full_name'),
            'bank_name' => $request->input('bank_name'),
            'unique_code' => $request->input('unique_code'),
            'account_no' => $request->input('account_no'),
            'account_name' => $request->input('account_name'),
            'account_type' => $request->input('account_type'),
            'statement_month' => $request->input('statement_month'),
            'opening_balance' => $request->input('opening_balance', 0),
            'closing_balance' => $request->input('closing_balance'),
            'method' => $request->input('method'),
            'path' => $request->input('path')
        ]);

        return response()->json([
            "success" => true,
            "message" => "Bank statement stored",
            "id" => $bankStatement->id
        ]);
    }
   
    public function update(Request $request, $id)
    {
        $bankStatement = BankStatement::find($id);
        if (!$bankStatement) {
            return response()->json(["success" => false, "message" => "Bank statement not found"], 404);
        }

        // ✅ Update statement month, opening balance & closing balance
        $bankStatement->update([
            'statement_month' => $request->input('statement_month'),
            'opening_balance' => $request->input('opening_balance'),
            'closing_balance' => $request->input('closing_balance'),
        ]);

        return response()->json(["success" => true, "message" => "Bank statement updated"]);
    }

    // ✅ Process HTML Transactions
    private function storeTransactionsFromHTML($filePath, $bankStatementId) {
        $htmlContent = file_get_contents(storage_path("app/{$filePath}"));
        $crawler = new Crawler($htmlContent);

        // Parse transactions from HTML table
        $crawler->filter('#table-column-toggle tbody tr')->each(function (Crawler $row) use ($bankStatementId) {
            $columns = $row->filter('td')->each(fn($td) => trim($td->text()));

            if (count($columns) >= 6) {
                BankStatementTransaction::create([
                    'bank_statement_id' => $bankStatementId,
                    'posting_date' => date('Y-m-d', strtotime($columns[1] ?? '')),
                    'transaction_date' => date('Y-m-d', strtotime($columns[2] ?? '')),
                    'description' => $columns[3] ?? '',
                    'amount' => floatval(str_replace(',', '', $columns[4] ?? '0')),
                    'transaction_type' => strtoupper(trim($columns[5] ?? 'DR')),
                ]);
            }
        });
    }
}
