<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Illuminate\Support\Facades\Log;

class ScraperController extends Controller
{
    public function scrapeBank(Request $request)
    {
        set_time_limit(300); // Allow script to run for 5 minutes

        $bank = $request->input('bank');
        $accessId = $request->input('access_id');
        $password = $request->input('password');

        if (!$bank || !$accessId || !$password) {
            return response()->json([
                "success" => false, 
                "message" => "Missing required fields"
            ], 400);
        }

        // 🔹 Normalize the input bank name
        $normalizedBank = strtolower(trim($bank)); // Convert to lowercase & remove spaces

        // 🔹 Map bank names to their respective short codes
        $bankMap = [
            "pbe bank" => "pbe",
            "maybank" => "maybank",
            "cimb bank" => "cimb",
            "rhb bank" => "rhb",
            "hong leong bank" => "hlb",
            "ambank" => "ambank"
        ];

        // 🔹 Get the short code (default to original if no match)
        $bankCode = $bankMap[$normalizedBank] ?? $normalizedBank;


        // Define Node.js and the Playwright-based script path
        $nodePath = "node"; //"C:\\Program Files\\nodejs\\node.exe"; 
        //$nodePath = "C:\\PROGRA~1\\nodejs\\node.exe";
        // Update the script name to the Playwright version (e.g., scraper-playwright.js)
        $scriptPath = base_path("scripts" . DIRECTORY_SEPARATOR . "pw-pbe.js");

        Log::info("Current Laravel Working Directory: " . getcwd());

        // Ensure the scraper script exists
        if (!file_exists($scriptPath)) {
            Log::error("Scraper script not found: " . $scriptPath);
            return response()->json(["success" => false, "message" => "Scraper script not found"], 500);
        }

        // Use Symfony Process to run Node.js with Playwright
        $command = "\"$nodePath\" \"$scriptPath\" \"$bankCode\" \"$accessId\" \"$password\"";
        
        $env = array_merge($_ENV, [
            'PATH' => getenv('PATH'), // Ensures Playwright can locate necessary binaries
            'HTTP_PROXY' => getenv('HTTP_PROXY'),
            'HTTPS_PROXY' => getenv('HTTPS_PROXY'),
            'NO_PROXY' => getenv('NO_PROXY')
        ]);
        
        $process = Process::fromShellCommandline($command, base_path(), $env, null, 300);
        // $process = Process::fromShellCommandline($command, base_path(), $env);
        // $process->setTimeout(300); // Explicitly set timeout
        // $process->run();

        Log::info("Executing Scraper: " . $command);

        try {
            // Run the process and capture its output
            $process->mustRun();
            $output = $process->getOutput();
            $errorOutput = $process->getErrorOutput();

            Log::info("Scraper Output: " . $output);
            Log::error("Scraper Error Output: " . $errorOutput);

            // Ensure valid JSON response from the scraper script
            $jsonOutput = json_decode($output, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error("Invalid JSON response from scraper-playwright.js: " . json_last_error_msg());
                return response()->json(["success" => false, "message" => "Invalid JSON response"], 500);
            }

            return response()->json(["success" => true, "message" => "Scraping completed", "data" => $jsonOutput]);

        } catch (ProcessFailedException $exception) {
            Log::error("Scraper Process Failed: " . $exception->getMessage());

            return response()->json([
                "success" => false,
                "message" => "Scraping failed",
                "error" => $exception->getMessage()
            ], 500);
        }
    }
}
